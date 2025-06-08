import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  MenuItem,
  CircularProgress,
  InputAdornment,
  Popover
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon,
  PictureAsPdf as PictureAsPdfIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { datacenters, equipment } from '../api';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:8000/api';

const Datacenter = () => {
  // Constants
  const MAX_RETRIES = 3;
  const REQUEST_TIMEOUT = 10000; // 10 seconds

  // Router and navigation
  const { id } = useParams();
  const navigate = useNavigate();

  // Data state
  const [datacenter, setDatacenter] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [serviceTags, setServiceTags] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);

  // Form state
  const [equipmentForm, setEquipmentForm] = useState({
    equipment_type: '',
    service_tag: '',
    license_type: '',
    serial_number: '',
    license_expired_date: ''
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState(null);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    equipment: null
  });

  // Error and loading states
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('equipment_type');
  const [searchValue, setSearchValue] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [filters, setFilters] = useState({
    service_tag: '',
    license_type: ''
  });
  const [availableOptions, setAvailableOptions] = useState({
    service_tag: new Set(),
    license_type: new Set()
  });
  const [showDropdown, setShowDropdown] = useState(false);

  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendMessage, setEmailSendMessage] = useState('');

  // Snackbar state
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  // Retry state
  const [retryCount, setRetryCount] = useState(0);

  // Common datacenter equipment types
  const equipmentTypes = [
    'Server',
    'Firewall',
    'Storage Array',
    'Switch',
    'Router',
    'Load Balancer',
    'NAS',
    'SAN',
    'Backup Appliance',
    'UPS',
    'PDU',
    'KVM Switch',
    'Network Attached Storage',
    'Tape Library',
    'Network Appliance',
    'Security Appliance',
    'Wireless Controller',
    'VoIP Gateway',
    'Media Gateway',
    'Optical Transport'
  ];

  // File input ref for Excel import
  const fileInputRef = useRef(null);

  const makeRequest = async (requestFn) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await requestFn();
      setRetryCount(0); // Reset retry count on success
      return response;
    } catch (error) {
      if (error.code === 'ECONNABORTED' && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return makeRequest(requestFn);
      }
      throw error;
    }
  };

  const fetchEquipments = async (filters = {}) => {
    if (!id) return;
    setIsLoading(true);
    try {
      // Use the equipment.list with filters if provided
      const eqs = await equipment.list(id, filters);
      // Only update state if we're not in a filtered search
      if (Object.keys(filters).length === 0) {
        setEquipments(eqs);
      }
      setFilteredEquipments(eqs);
      setError('');
    } catch (error) {
      console.error('Error fetching equipment:', error);
      setError('Failed to fetch equipment. Please try again.');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      // Reset all filters when datacenter changes
      setSearchValue('');
      setFilters({
        service_tag: '',
        license_type: ''
      });
      setFilteredEquipments([]);

      try {
        const dc = await datacenters.get(id);
        setDatacenter(dc);
        await fetchEquipments({}); // Fetch all equipment for the new datacenter
        fetchLicenseTypes();
        fetchServiceTags();
      } catch (err) {
        let msg = 'Datacenter not found or failed to load.';
        if (err.response) {
          msg += ` (Status: ${err.response.status})`;
          if (err.response.data && err.response.data.error) {
            msg += `\n${err.response.data.error}`;
          }
        } else if (err.message) {
          msg += `\n${err.message}`;
        }
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const fetchLicenseTypes = async () => {
    if (!id) return;

    try {
      const response = await makeRequest(() =>
        axios.get(`${API_URL}/datacenters/${id}/equipments/license-types/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          timeout: REQUEST_TIMEOUT
        })
      );

      setLicenseTypes(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        window.location.href = '/login';
        return;
      }
      console.error('Error fetching license types:', error);
    }
  };

  const fetchServiceTags = async () => {
    if (!id) return;

    try {
      const response = await makeRequest(() =>
        axios.get(`${API_URL}/datacenters/${id}/equipments/service-tags/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          timeout: REQUEST_TIMEOUT
        })
      );

      setServiceTags(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        window.location.href = '/login';
        return;
      }
      console.error('Error fetching service tags:', error);
    }
  };

  const checkExpiringLicenses = async () => {
    try {
      const response = await axios.get(`${API_URL}/datacenters/${id}/equipments/expiring/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.data && response.data.length > 0) {
        setShowExpiringSoon(true);
      }
    } catch (error) {
      console.error("Error checking expiring licenses:", error);
    }
  };

  // State for filters and search (moved to top with other state declarations)

  // Update available options when equipments change
  useEffect(() => {
    if (equipments && equipments.length > 0) {
      const serviceTags = new Set();
      const licenseTypes = new Set();

      equipments.forEach(eq => {
        if (eq.service_tag) serviceTags.add(eq.service_tag);
        if (eq.license_type) licenseTypes.add(eq.license_type);
      });

      setAvailableOptions({
        service_tag: serviceTags,
        license_type: licenseTypes
      });
    }
  }, [equipments]);

  // Handle search input change with smart filtering
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);

    // Show dropdown when typing
    if (value.trim()) {
      setShowDropdown(true);

      // Apply smart filtering as user types
      const searchTerm = value.toLowerCase();
      const filtered = equipments.filter(equipment => {
        // Search across multiple fields
        return (
          equipment.equipment_type?.toLowerCase().includes(searchTerm) ||
          equipment.service_tag?.toLowerCase().includes(searchTerm) ||
          equipment.license_type?.toLowerCase().includes(searchTerm) ||
          equipment.serial_number?.toLowerCase().includes(searchTerm)
        );
      });

      setFilteredEquipments(filtered);
    } else {
      setShowDropdown(false);
      // Reset to show all equipment when search is empty
      setFilteredEquipments(equipments);
    }
  };

  // Handle search button click - show all matching results
  const handleSearch = () => {
    setShowDropdown(false);

    if (!searchValue.trim()) {
      // If search is empty, clear all filters and show all
      const emptyFilters = {
        service_tag: '',
        license_type: ''
      };
      setFilters(emptyFilters);
      setFilteredEquipments(equipments);
      return;
    }

    // Apply smart filtering
    const searchTerm = searchValue.trim().toLowerCase();
    const filtered = equipments.filter(equipment => {
      return (
        equipment.equipment_type?.toLowerCase().includes(searchTerm) ||
        equipment.service_tag?.toLowerCase().includes(searchTerm) ||
        equipment.license_type?.toLowerCase().includes(searchTerm) ||
        equipment.serial_number?.toLowerCase().includes(searchTerm)
      );
    });

    setFilteredEquipments(filtered);
  };

  // Handle pressing Enter in the search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle selecting an option from dropdown
  const handleSelectOption = (option) => {
    setSearchValue(option);
    setShowDropdown(false);

    // Apply smart filtering based on selected option
    const searchTerm = option.toLowerCase();
    const filtered = equipments.filter(equipment => {
      return (
        equipment.equipment_type?.toLowerCase().includes(searchTerm) ||
        equipment.service_tag?.toLowerCase().includes(searchTerm) ||
        equipment.license_type?.toLowerCase().includes(searchTerm) ||
        equipment.serial_number?.toLowerCase().includes(searchTerm)
      );
    });

    setFilteredEquipments(filtered);
  };

  // Handle search type change
  const handleSearchTypeChange = (e) => {
    const newSearchType = e.target.value;
    setSearchType(newSearchType);
    setSearchValue('');
    setShowDropdown(false);

    // Clear the previous filter for the old type
    const newFilters = { ...filters };
    newFilters[searchType] = '';
    setFilters(newFilters);

    // If we have a filter for the other type, keep it
    const activeFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, v]) => v.trim() !== '')
    );

    fetchEquipments(activeFilters);
  };

  // Clear a specific filter
  const clearFilter = (filterType) => {
    const newFilters = { ...filters, [filterType]: '' };
    setFilters(newFilters);

    const activeFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, value]) => value.trim() !== '')
    );

    if (Object.keys(activeFilters).length === 0) {
      fetchEquipments({});
    } else {
      fetchEquipments(activeFilters);
    }
  };

  const handleFilterChange = (key) => (event) => {
    const newFilters = { ...filters, [key]: event.target.value };
    setFilters(newFilters);

    const activeFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, value]) => value.trim() !== '')
    );

    if (Object.keys(activeFilters).length === 0) {
      fetchEquipments({});
    } else {
      fetchEquipments(activeFilters);
    }
  };

  // Handle edit equipment
  const handleEdit = (equipment) => {
    setIsEditMode(true);
    setCurrentEquipment(equipment);
    setEquipmentForm({
      equipment_type: equipment.equipment_type || '',
      service_tag: equipment.service_tag || '',
      license_type: equipment.license_type || '',
      serial_number: equipment.serial_number || '',
      license_expired_date: equipment.license_expired_date || ''
    });
    setOpenDialog(true);
  };

  // Handle add equipment
  const handleAddEquipment = () => {
    setIsEditMode(false);
    setCurrentEquipment(null);
    setEquipmentForm({
      equipment_type: '',
      service_tag: '',
      license_type: '',
      serial_number: '',
      license_expired_date: ''
    });
    setOpenDialog(true);
  };

  // Handle delete equipment
  const handleDeleteEquipment = (equipment) => {
    setDeleteConfirm({
      open: true,
      equipment: equipment
    });
  };

  // Handle delete equipment
  const handleDeleteClick = (equipmentId, equipmentName) => {
    setDeleteConfirm({
      open: true,
      equipmentId,
      equipmentName: equipmentName || 'this equipment'
    });
  };

  // Confirm delete equipment
  const confirmDelete = async () => {
    if (!deleteConfirm.equipment) return;

    try {
      setDeleteLoading(true);
      setDeleteMessage('Deleting equipment...');

      const response = await axios.delete(
        `${API_URL}/datacenters/${id}/equipments/${deleteConfirm.equipment.id}/delete/`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSnackbarMessage(`✅ Equipment deleted successfully: ${deleteConfirm.equipment.equipment_type} (${deleteConfirm.equipment.service_tag})`);
        setSnackbarSeverity('success');
        fetchEquipments(); // Refresh the equipment list
      } else {
        throw new Error(response.data.error || 'Failed to delete equipment');
      }
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete equipment. Please try again.';
      setSnackbarMessage(`❌ ${errorMessage}`);
      setSnackbarSeverity('error');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm({
        open: false,
        equipment: null
      });
      setOpenSnackbar(true);
      setTimeout(() => setDeleteMessage(''), 5000);
    }
  };

  // Cancel delete confirmation
  const cancelDelete = () => {
    setDeleteConfirm({
      open: false,
      equipment: null
    });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSubmit = async () => {
    if (!equipmentForm.equipment_type || !equipmentForm.service_tag || !equipmentForm.license_type || !equipmentForm.serial_number) {
      setError('Please fill in all required fields');
      setShowError(true);
      return;
    }

    try {
      if (isEditMode) {
        await axios.patch(`${API_URL}/datacenters/${id}/equipments/${currentEquipment.id}/modify/`,
          equipmentForm,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setOpenDialog(false);
        fetchEquipments();
      } else {
        await axios.post(`${API_URL}/datacenters/${id}/equipments/add/`,
          equipmentForm,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setOpenDialog(false);
        fetchEquipments();
      }
    } catch (error) {
      console.error('Error saving equipment:', error);
      setError('Failed to save equipment. Please try again.');
      setShowError(true);
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSnackbarMessage('No file selected');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      return;
    }

    // Reset file input to allow re-importing the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setImportLoading(true);
    setImportMessage('Preparing to import equipment...');
    setError('');
    setShowError(false);
    setImportErrors([]);

    try {
      // Check authentication status first
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        throw new Error('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      setImportMessage('Uploading and processing file...');

      const response = await axios.post(
        `${API_URL}/datacenters/${id}/equipments/import-excel/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 120000 // 2 minutes timeout for large files
        }
      );

      const {
        message: responseMessage,
        imported_count = 0,
        updated_count = 0,
        error_count = 0,
        errors = [],
        warnings = []
      } = response.data;

      // Refresh the equipment list
      setImportMessage('Finalizing import and refreshing data...');
      await fetchEquipments();

      // Prepare detailed success message
      const successMsg = [
        `✅ Successfully processed ${imported_count + updated_count} equipment items:`,
        imported_count > 0 ? `• ${imported_count} new items added` : '',
        updated_count > 0 ? `• ${updated_count} existing items updated` : '',
        error_count > 0 ? `• ${error_count} items had errors` : ''
      ].filter(Boolean).join('\n');

      setSnackbarMessage(successMsg);
      setSnackbarSeverity('success');
      setOpenSnackbar(true);

      // Show errors if any
      if (error_count > 0 || (errors && errors.length > 0)) {
        const errorMessages = [];

        if (Array.isArray(errors)) {
          errorMessages.push(...errors);
        } else if (typeof errors === 'object') {
          Object.entries(errors).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errorMessages.push(...value.map(v => `${key}: ${v}`));
            } else {
              errorMessages.push(`${key}: ${value}`);
            }
          });
        }

        setImportErrors(errorMessages);
        setError('Some items could not be imported. See details below.');
        setShowError(true);
      }
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to import Excel file';
      setSnackbarMessage(`❌ Import failed: ${errorMessage}`);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      setError(errorMessage);
      setShowError(true);
    } finally {
      setImportLoading(false);
      setImportMessage('');
    }
  };

  const handleExportExcel = () => {
    if (!id) return;

    axios.get(`${API_URL}/datacenters/${id}/equipments/export-excel/`, {
      params: {
        service_tag: filters.service_tag || '',
        license_type: filters.license_type || '',
      },
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    })
      .then(response => {
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `equipments_${id}_${new Date().toISOString().split('T')[0]}.xlsx`);
      })
      .catch(error => {
        console.error("Error exporting Excel:", error);
        setError("Error exporting Excel");
        setShowError(true);
      });
  };

  const handleExportPDF = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/datacenters/${id}/equipments/export-pdf/`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `equipment_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error exporting PDF:", error);
      setError("Failed to export PDF");
      setShowError(true);
    }
  };

  const handleSendPDF = async () => {
    if (!emailToSend) {
      setError('Please enter an email address');
      setSnackbarMessage('❌ Please enter an email address');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      return;
    }

    setEmailSending(true);
    try {
      const response = await axios.post(
        `${API_URL}/datacenters/${id}/equipments/send-pdf/`,
        { email: emailToSend },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setSnackbarMessage(`✅ PDF report sent successfully to ${emailToSend}`);
      setSnackbarSeverity('success');
      setEmailDialogOpen(false);
      setEmailToSend('');
    } catch (error) {
      console.error('Error sending PDF:', error);
      const errorMessage = error.response?.data?.error || 'Failed to send PDF report';
      setSnackbarMessage(`❌ ${errorMessage}`);
      setSnackbarSeverity('error');
      setError(errorMessage);
    } finally {
      setEmailSending(false);
      setOpenSnackbar(true);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchEquipments();
    fetchLicenseTypes();
    fetchServiceTags();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 600 }}>{error}</Alert>
        <Button
          variant="contained"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/datacenters')}
        >
          Back to Datacenters
        </Button>
      </Box>
    );
  }

  // Main content render
  const renderContent = () => {
    if (error) {
      return (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={fetchEquipments}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Retry Loading Data
          </Button>
        </Box>
      );
    }

    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', bgcolor: '#ffffff', borderRadius: 2, p: 2 }}>
          <Typography variant="h6" sx={{ color: '#007bff' }}>Loading...</Typography>
        </Box>
      );
    }

    return (
      <>
        <Box sx={{ width: '100%', mb: 4 }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
            gap: 3,
            '& .action-button': {
              borderRadius: 2,
              textTransform: 'none',
              height: '100%',
              minHeight: '56px',
              px: 3,
              '& .MuiButton-startIcon': {
                mr: 1.5
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
                '&.MuiButton-contained': {
                  bgcolor: 'primary.dark'
                },
                '&.MuiButton-outlined': {
                  bgcolor: 'action.hover'
                }
              },
              transition: 'all 0.2s ease-in-out'
            }
          }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddEquipment}
              className="action-button"
              sx={{
                bgcolor: 'primary.main',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }}
            >
              Add Equipment
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              className="action-button"
            >
              Import Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              className="action-button"
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPDF}
              className="action-button"
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              onClick={() => setEmailDialogOpen(true)}
              className="action-button"
            >
              Send PDF
            </Button>
          </Box>

          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            width: '100%',
            maxWidth: '100%',
            mt: 2
          }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
              <TextField
                select
                variant="outlined"
                size="small"
                value={searchType}
                onChange={handleSearchTypeChange}
                sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="equipment_type">Equipment Type</MenuItem>
                <MenuItem value="service_tag">Service Tag</MenuItem>
                <MenuItem value="license_type">License Type</MenuItem>
              </TextField>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder={`Search by ${searchType.replace('_', ' ')}...`}
                value={searchValue}
                onChange={handleSearchChange}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchValue && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSearchValue('');
                          setShowDropdown(false);
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  style: { borderRadius: 16, backgroundColor: '#f5f5f5' }
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearch}
                sx={{ borderRadius: 16, textTransform: 'none', px: 3 }}
              >
                Search
              </Button>
            </Box>

            {/* Active filters */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {Object.entries(filters).map(([key, value]) => (
                value && (
                  <Chip
                    key={key}
                    label={`${key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}: ${value}`}
                    onDelete={() => clearFilter(key)}
                    sx={{ borderRadius: 2 }}
                  />
                )
              ))}
              {(filters.service_tag || filters.license_type) && (
                <Button
                  size="small"
                  onClick={() => {
                    setFilters({ service_tag: '', license_type: '' });
                    fetchEquipments({});
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Clear all
                </Button>
              )}
            </Box>

            {/* Dropdown for suggestions */}
            {showDropdown && searchValue && availableOptions[searchType]?.length > 0 && (
              <Paper
                sx={{
                  position: 'absolute',
                  zIndex: 1,
                  mt: 1,
                  width: '100%',
                  maxHeight: 200,
                  overflow: 'auto',
                  boxShadow: 3,
                  borderRadius: 2
                }}
              >
                {availableOptions[searchType]
                  .filter(option =>
                    option.toLowerCase().includes(searchValue.toLowerCase())
                  )
                  .map((option, index) => (
                    <MenuItem
                      key={index}
                      onClick={() => handleSelectOption(option)}
                      sx={{ px: 2, py: 1 }}
                    >
                      {option}
                    </MenuItem>
                  ))
                }
              </Paper>
            )}
          </Box>
        </Box>

        <Box sx={{ bgcolor: '#ffffff', borderRadius: 2, p: 2 }}>
          <TableContainer component={Paper} sx={{ bgcolor: '#ffffff' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#e3f2fd' }}>
                <TableRow>
                  <TableCell sx={{ color: '#007bff', fontWeight: 500 }}>Equipment Type</TableCell>
                  <TableCell sx={{ color: '#007bff', fontWeight: 500 }}>Service Tag</TableCell>
                  <TableCell sx={{ color: '#007bff', fontWeight: 500 }}>License Type</TableCell>
                  <TableCell sx={{ color: '#007bff', fontWeight: 500 }}>Serial Number</TableCell>
                  <TableCell sx={{ color: '#007bff', fontWeight: 500 }}>License Expiry</TableCell>
                  <TableCell sx={{ color: '#007bff', fontWeight: 500 }}>Status</TableCell>
                  <TableCell sx={{ color: '#007bff', fontWeight: 500 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEquipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1" sx={{ py: 3, color: '#007bff' }}>
                        No equipment data found. Add equipment to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipments.map((equipment) => (
                    <TableRow
                      key={equipment.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#f5f5f5'
                        },
                        '& td': {
                          color: '#007bff'
                        }
                      }}
                    >
                      <TableCell>{equipment.equipment_type}</TableCell>
                      <TableCell>{equipment.service_tag}</TableCell>
                      <TableCell>{equipment.license_type}</TableCell>
                      <TableCell>{equipment.serial_number}</TableCell>
                      <TableCell>
                        {equipment.license_expired_date
                          ? new Date(equipment.license_expired_date).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {equipment.is_expired ? (
                          <Chip
                            label="Expired"
                            color="error"
                            size="small"
                            sx={{
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          />
                        ) : (
                          <Chip
                            label="Active"
                            color="success"
                            size="small"
                            sx={{
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 500
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              handleEdit(equipment);
                              setOpenDialog(true);
                            }}
                            startIcon={<EditIcon />}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 2
                            }}
                          >
                            Edit
                          </Button>
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteEquipment(equipment)}
                            disabled={deleteLoading}
                            title="Delete equipment"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </>
    );
  };

  return (
    <Box component="div" sx={{ p: 3 }}>
      {showError && (
        <Alert
          severity="error"
          sx={{
            mt: 2,
            mb: 2,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Box sx={{ width: '100%' }}>
            <Typography variant="body1" gutterBottom>
              {error}
            </Typography>

            {importErrors && importErrors.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Error Details (showing first 5 of {importErrors.length}):
                </Typography>
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 2,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    '& li': {
                      mb: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }
                  }}
                >
                  {importErrors.slice(0, 5).map((err, idx) => (
                    <Box component="li" key={idx}>
                      {err}
                    </Box>
                  ))}
                </Box>

                {importErrors.length > 5 && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                    ... and {importErrors.length - 5} more errors not shown
                  </Typography>
                )}

                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  Tip: Check that all required columns are present and contain valid data.
                </Typography>
              </Box>
            )}
          </Box>
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, mt: 3 }}>
        {renderContent()}
      </Box>

      {/* Loading Indicator */}
      {(importLoading || deleteLoading) && (
        <Box sx={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
          <Chip
            label={importLoading ? importMessage || 'Importing...' : deleteMessage || 'Deleting...'}
            color="primary"
            sx={{
              bgcolor: '#4a90e2',
              color: 'white',
              borderRadius: 2,
              px: 3,
              py: 1
            }}
          />
        </Box>
      )}

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleExcelImport}
        accept=".xlsx"
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEditMode ? 'Edit Equipment' : 'Add Equipment'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Autocomplete
              freeSolo
              options={equipmentTypes}
              value={equipmentForm.equipment_type}
              onChange={(event, newValue) => {
                setEquipmentForm({ ...equipmentForm, equipment_type: newValue || '' });
              }}
              onInputChange={(event, newInputValue) => {
                setEquipmentForm({ ...equipmentForm, equipment_type: newInputValue });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label="Equipment Type"
                  margin="normal"
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
            />
            <TextField
              fullWidth
              label="Service Tag"
              value={equipmentForm.service_tag}
              onChange={(e) => setEquipmentForm({ ...equipmentForm, service_tag: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="License Type"
              value={equipmentForm.license_type}
              onChange={(e) => setEquipmentForm({ ...equipmentForm, license_type: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Serial Number"
              value={equipmentForm.serial_number}
              onChange={(e) => setEquipmentForm({ ...equipmentForm, serial_number: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="License Expiry Date"
              type="date"
              value={equipmentForm.license_expired_date}
              onChange={(e) => setEquipmentForm({ ...equipmentForm, license_expired_date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ textTransform: 'none' }}
          >
            {isEditMode ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={cancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Equipment</DialogTitle>
        <DialogContent>
          <Typography variant="h6" component="div" sx={{ mb: 2 }}>
            Are you sure you want to delete this equipment?
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Type: {deleteConfirm.equipment?.equipment_type}
          </Typography>
          <Typography variant="body1">
            Service Tag: {deleteConfirm.equipment?.service_tag}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="primary">
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send PDF Report</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email Address"
            value={emailToSend}
            onChange={(e) => setEmailToSend(e.target.value)}
            margin="normal"
            error={error && !emailToSend}
            helperText={error && !emailToSend ? 'Please enter an email address' : ''}
          />
          <Typography variant="caption" sx={{ mt: 2 }}>
            The PDF report will be sent to the specified email address.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendPDF}
            disabled={emailSending}
          >
            {emailSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={8000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: '100%',
            whiteSpace: 'pre-line',
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Datacenter;
