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
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { saveAs } from 'file-saver';

const API_URL = 'http://localhost:8000/api';

const Datacenter = () => {
  const { datacenterId } = useParams();
  const [datacenter, setDatacenter] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [licenseTypes, setLicenseTypes] = useState([]);
  const [serviceTags, setServiceTags] = useState([]);
  const [serviceTagFilter, setServiceTagFilter] = useState('');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('');

  // Error state
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEquipment, setCurrentEquipment] = useState(null);
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
  const [isLoading, setIsLoading] = useState(false);

  // For PDF email
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSendMessage, setEmailSendMessage] = useState("");

  // Get token from localStorage
  const token = localStorage.getItem('access_token');

  useEffect(() => {
    if (!datacenterId) {
      console.error('Datacenter ID is undefined or missing');
      return;
    }

    setIsLoading(true);

    const fetchDataCenter = async () => {
      try {
        const response = await axios.get(`${API_URL}/datacenters/${datacenterId}/`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setDatacenter(response.data);
        setError(null);
      } catch (error) {
        console.error("Error fetching datacenter:", error);
        setError("Failed to load datacenter data");
        setShowError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataCenter();
    fetchEquipments();
    fetchLicenseTypes();
    fetchServiceTags();

    // Poll less frequently to reduce server load
    let interval = null;
    if (!serviceTagFilter && !licenseTypeFilter) {
      interval = setInterval(() => {
        fetchEquipments();
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [datacenterId, serviceTagFilter, licenseTypeFilter, token]);

  const fetchEquipments = async () => {
    if (!datacenterId) return; // Early return if no datacenterId

    try {
      const response = await axios.get(`${API_URL}/datacenters/${datacenterId}/equipments/`, {
        params: {
          service_tag: serviceTagFilter,
          license_type: licenseTypeFilter,
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setEquipments(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching equipments:", error);
      setError("Failed to fetch equipments");
      setShowError(true);
    }
  };

  const fetchLicenseTypes = async () => {
    if (!datacenterId) return;

    try {
      const response = await axios.get(`${API_URL}/datacenters/${datacenterId}/equipments/license-types/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setLicenseTypes(response.data);
    } catch (error) {
      console.error('Error fetching license types:', error);
    }
  };

  const fetchServiceTags = async () => {
    if (!datacenterId) return;

    try {
      const response = await axios.get(`${API_URL}/datacenters/${datacenterId}/equipments/service-tags/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setServiceTags(response.data);
    } catch (error) {
      console.error('Error fetching service tags:', error);
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

  const handleDelete = async (equipmentId) => {
    try {
      if (!window.confirm('Are you sure you want to delete this equipment?')) {
        return;
      }

      // Show loading state
      setDeleteLoading(true);
      setDeleteMessage('Deleting equipment...');

      await axios.delete(`${API_URL}/datacenters/${datacenterId}/equipments/${equipmentId}/delete/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Clear loading state
      setDeleteLoading(false);
      setDeleteMessage('Equipment deleted successfully!');

      // Refresh the list after a short delay
      setTimeout(() => {
        fetchEquipments();
      }, 1000);
    } catch (error) {
      console.error('Error deleting equipment:', error);
      setDeleteLoading(false);
      setDeleteMessage('Failed to delete equipment. Please try again.');
      setTimeout(() => {
        setDeleteMessage('');
      }, 3000);
    }
  };

  const handleSubmit = async () => {
    if (!equipmentForm.equipment_type || !equipmentForm.service_tag || !equipmentForm.license_type || !equipmentForm.serial_number) {
      setError('Please fill in all required fields');
      setShowError(true);
      return;
    }

    try {
      if (isEditMode) {
        await axios.patch(`${API_URL}/datacenters/${datacenterId}/equipments/${currentEquipment.id}/modify/`,
          equipmentForm,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setOpenDialog(false);
        fetchEquipments();
      } else {
        await axios.post(`${API_URL}/datacenters/${datacenterId}/equipments/add/`,
          equipmentForm,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
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

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);

      setImportLoading(true);
      axios.post(`${API_URL}/datacenters/${datacenterId}/equipments/import-excel/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
        .then(() => {
          setImportMessage('Import successful!');
          fetchEquipments();
        })
        .catch(error => {
          setImportMessage('Import failed: ' + error.response?.data?.detail || 'Unknown error');
        })
        .finally(() => {
          setImportLoading(false);
        });
    }
  };

  const handleExportExcel = () => {
    if (!datacenterId) return;

    axios.get(`${API_URL}/datacenters/${datacenterId}/equipments/export-excel/`, {
      params: {
        service_tag: serviceTagFilter,
        license_type: licenseTypeFilter,
      },
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `equipments_${datacenterId}_${new Date().toISOString().split('T')[0]}.xlsx`);
      })
      .catch(error => {
        console.error("Error exporting Excel:", error);
        setError("Error exporting Excel");
        setShowError(true);
      });
  };

  const handleExportPDF = () => {
    if (!datacenterId) return;

    axios.get(`${API_URL}/datacenters/${datacenterId}/equipments/export-pdf/`, {
      params: {
        service_tag: serviceTagFilter,
        license_type: licenseTypeFilter,
      },
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        saveAs(blob, `equipments_${datacenterId}_${new Date().toISOString().split('T')[0]}.pdf`);
      })
      .catch(error => {
        console.error("Error exporting PDF:", error);
        setError("Error exporting PDF");
        setShowError(true);
      });
  };

  const handleSendPDF = () => {
    if (!emailToSend) {
      setEmailSendMessage('Please enter an email address');
      return;
    }

    setEmailSending(true);
    axios.post(`${API_URL}/datacenters/${datacenterId}/pdf/`,
      { email: emailToSend },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
      .then(() => {
        setEmailSendMessage('Email sent successfully!');
      })
      .catch(error => {
        setEmailSendMessage('Failed to send PDF: ' + error.response?.data?.detail || 'Unknown error');
      })
      .finally(() => {
        setEmailSending(false);
      });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowError(false)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#007bff' }}>
          {datacenter?.name || 'No datacenter selected'}
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
          <Button
            variant="outlined"
            startIcon={<EmailIcon />}
            onClick={() => setEmailDialogOpen(true)}
            sx={{
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Send PDF
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
                {equipments.length === 0 && !error ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body1" sx={{ py: 3, color: '#007bff' }}>
                        No equipment data found. Add equipment to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  equipments.map((equipment) => (
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
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleDelete(equipment.id)}
                            startIcon={<DeleteIcon />}
                            sx={{
                              textTransform: 'none',
                              borderRadius: 2
                            }}
                          >
                            Delete
                          </Button>
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
            <TextField
              fullWidth
              label="Equipment Type"
              value={equipmentForm.equipment_type}
              onChange={(e) => setEquipmentForm({ ...equipmentForm, equipment_type: e.target.value })}
              margin="normal"
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
