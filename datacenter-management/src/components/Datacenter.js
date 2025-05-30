import React, { useState, useEffect, useRef } from 'react';
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
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { datacenters, equipment } from '../api';
import axios from 'axios';
import { saveAs } from 'file-saver';

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

  // Error state
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  const [searchType, setSearchType] = useState('service_tag'); // 'service_tag' or 'license_type'
  const [searchValue, setSearchValue] = useState('');
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState(null);
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
  const fileInputRef = useRef();
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // For PDF email
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendMessage, setEmailSendMessage] = useState("");

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

  const fetchEquipments = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const eqs = await equipment.list(id);
      setEquipments(eqs);
      setFilteredEquipments(eqs);
      setError(null);
    } catch (error) {
      setError('Failed to fetch equipments. Please try again.');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dc = await datacenters.get(id);
        setDatacenter(dc);
        await fetchEquipments();
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

  const handleSearch = () => {
    if (!searchValue.trim()) {
      setFilteredEquipments(equipments);
      return;
    }

    const filtered = equipments.filter(equipment => {
      if (searchType === 'service_tag') {
        return equipment.service_tag.toLowerCase().includes(searchValue.toLowerCase());
      } else {
        return equipment.license_type.toLowerCase().includes(searchValue.toLowerCase());
      }
    });

    setFilteredEquipments(filtered);
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

  const handleDeleteDialogClose = () => {
    setDeleteConfirm({ ...deleteConfirm, open: false });
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
    if (!file) return;

    // Reset file input to allow re-importing the same file
    e.target.value = null;

    setImportLoading(true);
    setImportMessage('Importing equipment...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/datacenters/${id}/equipments/import-excel/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          }
        }
      );

      setImportMessage(response.data.message || 'Import successful!');
      fetchEquipments();
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.error || 
                         'Failed to import Excel file. Please check the format and try again.';
      setImportMessage(`Import failed: ${errorMessage}`);
    } finally {
      setImportLoading(false);
      // Auto-clear the message after 5 seconds
      setTimeout(() => setImportMessage(''), 5000);
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

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert
          severity="error"
          onClose={() => setShowError(false)}
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          {error}
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

      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          select
          label="Search By"
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="service_tag">Service Tag</MenuItem>
          <MenuItem value="license_type">License Type</MenuItem>
        </TextField>

        <TextField
          label="Search Value"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          sx={{ flexGrow: 1 }}
        />

        <Button
          variant="contained"
          onClick={handleSearch}
          startIcon={<SearchIcon />}
        >
          Search
        </Button>

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
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current.click()}
            sx={{
              textTransform: 'none',
              borderRadius: 2
            }}
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

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ color: '#007bff', fontWeight: 500 }}>Filter by Service Tag</Typography>
          <Autocomplete
            options={serviceTags}
            value={serviceTagFilter}
            onChange={(event, newValue) => setServiceTagFilter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#007bff'
                    },
                    '&:hover fieldset': {
                      borderColor: '#007bff'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#007bff'
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: '#007bff'
                  }
                }}
              />
            )}
          />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
          <Typography variant="subtitle2" sx={{ color: '#007bff', fontWeight: 500 }}>Filter by License Type</Typography>
          <Autocomplete
            options={licenseTypes}
            value={licenseTypeFilter}
            onChange={(event, newValue) => setLicenseTypeFilter(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#007bff'
                    },
                    '&:hover fieldset': {
                      borderColor: '#007bff'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#007bff'
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: '#007bff'
                  }
                }}
              />
            )}
          />
        </Box>
      </Box>

      {error && (
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
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', bgcolor: '#ffffff', borderRadius: 2, p: 2 }}>
          <Typography variant="h6" sx={{ color: '#007bff' }}>Loading...</Typography>
        </Box>
      ) : (
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
                {filteredEquipments.length === 0 && !error ? (
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
                        {equipment.license_expired_date ?
                          new Date(equipment.license_expired_date).toLocaleDateString() :
                          'N/A'
                        }
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
      )}

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
        type="file"
        ref={fileInputRef}
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
    </Box>
  );
};

export default Datacenter;
