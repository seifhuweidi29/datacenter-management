
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
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { datacenters, equipment } from '../api';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:8000/api';

const Datacenter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [datacenter, setDatacenter] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [serviceTags, setServiceTags] = useState([]);
  const [serviceTagFilter, setServiceTagFilter] = useState('');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('');

  // Error and Dialog state
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState(null);
  
  // Search and filter state
  const [searchType, setSearchType] = useState('service_tag');
  const [searchValue, setSearchValue] = useState('');
  const [filters, setFilters] = useState({
    service_tag: '',
    license_type: ''
  });
  const [availableOptions, setAvailableOptions] = useState({
    service_tag: new Set(),
    license_type: new Set()
  });
  const [showDropdown, setShowDropdown] = useState(false);
  
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

  const [equipmentForm, setEquipmentForm] = useState({
    equipment_type: '',
    service_tag: '',
    license_type: '',
    serial_number: '',
    license_expired_date: '',
  });

  // For Excel import
  const fileInputRef = useRef(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // For PDF email
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendMessage, setEmailSendMessage] = useState('');

  // Snackbar state
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const REQUEST_TIMEOUT = 10000; // 10 seconds

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

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    
    // Show dropdown when typing
    if (value.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      // Clear the current filter if search is empty
      const newFilters = { ...filters };
      newFilters[searchType] = '';
      setFilters(newFilters);
      fetchEquipments({});
    }
  };

  // Handle search button click - exact match only
  const handleSearch = () => {
    setShowDropdown(false);
    
    if (!searchValue.trim()) {
      // If search is empty, clear all filters
      const emptyFilters = {
        service_tag: '',
        license_type: ''
      };
      setFilters(emptyFilters);
      fetchEquipments({});
      return;
    }
    
    // Apply exact match for the current search type
    const newFilters = {
      service_tag: '',
      license_type: ''
    };
    newFilters[searchType] = searchValue.trim();
    
    setFilters(newFilters);
    fetchEquipments(newFilters);
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
    
    // Apply the selected filter - exact match only
    const newFilters = {
      service_tag: '',
      license_type: ''
    };
    newFilters[searchType] = option;  // Only set the selected filter
    setFilters(newFilters);
    
    // Fetch with exact match
    const exactMatchFilters = {};
    exactMatchFilters[searchType] = option;
    fetchEquipments(exactMatchFilters);
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

  const handleAddEquipment = () => {
    setIsEditMode(false);
    setCurrentEquipment(null);
    setEquipmentForm({
      equipment_type: '',
      service_tag: '',
      license_type: '',
      serial_number: '',
      license_expired_date: '',
    });
    setOpenDialog(true);
  };

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

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    equipmentId: null,
    equipmentName: ''
  });

  const handleDeleteClick = (equipmentId, equipmentName) => {
    setDeleteConfirm({
      open: true,
      equipmentId,
      equipmentName: equipmentName || 'this equipment'
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.equipmentId) return;
    
    try {
      setDeleteLoading(true);
      setDeleteMessage('Deleting equipment...');

      await axios.delete(`${API_URL}/datacenters/${id}/equipments/${deleteConfirm.equipmentId}/delete/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Accept': 'application/json'
        }
      });

      setDeleteMessage('Equipment deleted successfully!');
      fetchEquipments();
    } catch (error) {
      console.error('Delete error:', error);
      setDeleteMessage('Failed to delete equipment. Please try again.');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm({ ...deleteConfirm, open: false });
      setTimeout(() => setDeleteMessage(''), 5000);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm({ ...deleteConfirm, open: false });
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
      console.log('No file selected');
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
      console.log('File added to form data:', file.name, 'Size:', file.size, 'bytes');

      // Make the import request
      console.log('Sending import request to:', `${API_URL}/datacenters/${id}/equipments/import-excel/`);
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

      console.log('Import response:', response.data);
      const { 
        message: responseMessage, 
        imported_count = 0, 
        error_count = 0, 
        errors = [], 
        warnings = [] 
      } = response.data;
      
      // Refresh the equipment list
      setImportMessage('Finalizing import and refreshing data...');
      await fetchEquipments();
      
      // Prepare success message
      const successMsg = [
        `Successfully imported ${imported_count} equipment items.`,
        error_count > 0 ? `${error_count} items had errors.` : ''
      ].filter(Boolean).join(' ');
      
      setImportMessage(successMsg);
      
      // Show errors if any
      if (error_count > 0 || (errors && errors.length > 0)) {
        console.error('Import completed with errors:', errors);
        const errorMessages = [];
        
        // Handle different error formats
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
        } else if (errors) {
          errorMessages.push(String(errors));
        }
        
        setImportErrors(errorMessages);
        setShowError(true);
      } else {
        setTimeout(() => setImportMessage(''), 5000);
      }
      
      // Log warnings if any
      if (warnings.length > 0) {
        console.warn('Import completed with warnings:', warnings);
      }
      
    } catch (error) {
      console.error('Error during import:', error);
      
      let errorMessage = 'Failed to import Excel file. ';
      
      if (error.response) {
        // Server responded with an error status code
        console.error('Server response:', error.response.data);
        
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please log in again.';
          // Clear any existing tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          // Redirect to login
          if (navigate) {
            navigate('/login');
          }
        } else if (error.response.data && typeof error.response.data === 'object') {
          // Handle structured error response
          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
        } else if (error.response.status === 413) {
          errorMessage = 'File too large. Please try a smaller file (max 10MB).';
        } else if (error.response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        // Request was made but no response received
        console.error('No response received:', error.request);
        errorMessage = 'No response from server. Please check your connection and try again.';
      } else if (error.message) {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message);
        errorMessage = error.message;
      } else {
        errorMessage = 'An unknown error occurred. Please try again.';
      }
      
      setError(errorMessage);
      setShowError(true);
      setImportMessage('');
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!id) return;

    axios.get(`${API_URL}/datacenters/${id}/equipments/export-excel/`, {
      params: {
        service_tag: serviceTagFilter,
        license_type: licenseTypeFilter,
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
      setError("Please enter an email address");
      setShowError(true);
      return;
    }

    setEmailSending(true);
    try {
      await axios.post(
        `${API_URL}/datacenters/${id}/equipments/send-pdf/`,
        { email: emailToSend },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      setEmailSendMessage("PDF sent successfully!");
      setEmailDialogOpen(false);
    } catch (error) {
      console.error("Error sending PDF:", error);
      setError("Failed to send PDF");
      setShowError(true);
    } finally {
      setEmailSending(false);
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
                            onClick={() => handleDeleteClick(equipment.id, `${equipment.equipment_type} - ${equipment.service_tag}`)}
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

      {showExpiringSoon && (
        <Alert
          severity="warning"
          onClose={() => setShowExpiringSoon(false)}
          sx={{ mb: 3 }}
        >
          Some licenses are expiring soon. Please check the equipment list.
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, flexWrap: 'wrap' }}>
          <TextField
            select
            label="Filter By"
            value={searchType}
            onChange={handleSearchTypeChange}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="service_tag">Service Tag</MenuItem>
            <MenuItem value="license_type">License Type</MenuItem>
          </TextField>

          <Box sx={{ position: 'relative', flexGrow: 1, maxWidth: 400 }}>
            <TextField
              fullWidth
              label={`Filter by ${searchType === 'service_tag' ? 'Service Tag' : 'License Type'}`}
              value={searchValue}
              onChange={handleSearchChange}
              onKeyPress={handleKeyPress}
              onFocus={() => searchValue.trim() && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder={`Type to filter by ${searchType === 'service_tag' ? 'service tag' : 'license type'}`}
              InputProps={{
                endAdornment: searchValue && (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => {
                        setSearchValue('');
                        setFilters({ service_tag: '', license_type: '' });
                        fetchEquipments({});
                      }}
                      edge="end"
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {showDropdown && searchValue && (
              <Paper 
                sx={{
                  position: 'absolute',
                  width: '100%',
                  maxHeight: 200,
                  overflow: 'auto',
                  mt: 0.5,
                  zIndex: 1,
                  boxShadow: 3
                }}
              >
                {Array.from(availableOptions[searchType] || [])
                  .filter(option => 
                    option && option.toLowerCase().includes(searchValue.toLowerCase())
                  )
                  .map((option, index) => (
                    <MenuItem 
                      key={index}
                      onClick={() => handleSelectOption(option)}
                      sx={{ px: 2, py: 1 }}
                    >
                      {option}
                    </MenuItem>
                  ))}
              </Paper>
            )}
          </Box>

          {/* Active filters display */}
          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            return (
              <Chip
                key={key}
                label={`${key.replace('_', ' ')}: ${value}`}
                onDelete={() => clearFilter(key)}
                color="primary"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            );
          })}
        </Box>

        <Button
          variant="contained"
          color="primary"
          onClick={handleExportPDF}
          startIcon={<DownloadIcon />}
        >
          Export PDF
        </Button>

        <Button
          variant="contained"
          color="secondary"
          onClick={() => setEmailDialogOpen(true)}
          startIcon={<EmailIcon />}
        >
          Send PDF
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#007bff' }}>
          {datacenter?.name || 'Datacenter'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddEquipment}
            sx={{
              bgcolor: '#007bff',
              color: 'white',
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Add Equipment
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current.click()}
            disabled={importLoading}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Import Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            sx={{
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {renderContent()}

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

      <Dialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send PDF</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email Address"
            value={emailToSend}
            onChange={(e) => setEmailToSend(e.target.value)}
            margin="normal"
            error={!emailToSend && emailSending}
            helperText={!emailToSend && emailSending ? 'Please enter an email address' : ''}
          />
          {emailSendMessage && (
            <Typography
              variant="body2"
              color={emailSendMessage.includes('success') ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              {emailSendMessage}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setEmailDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSendPDF}
            disabled={emailSending}
            sx={{ textTransform: 'none' }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Datacenter;
