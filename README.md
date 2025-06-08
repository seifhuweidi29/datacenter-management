# Datacenter Management System

A modern web application for managing datacenter equipment, licenses, and related operations.

## 🚀 Features

### Core Functionality
- Equipment management and tracking
- License expiration monitoring
- Excel import/export capabilities
- PDF report generation
- Email notifications
- Modern UI with Material-Design

### Enhanced Notifications
- Detailed success/error messages with emojis
- Multi-line notifications for better readability
- 8-second display duration for important messages
- Bullet-point formatting for better organization

### Data Operations
- Excel file import with detailed progress
- PDF report generation and email delivery
- Equipment deletion with confirmation
- Real-time data updates

## 🛠️ Technical Stack

### Frontend
- React with Material-UI
- Axios for API communication
- Modern JavaScript (ES6+)

### Backend
- Django REST Framework
- JWT Authentication
- Celery for background tasks
- Redis for task queue

## 📦 Installation

1. Install Python dependencies:
```bash
pip install django
pip install reportlab 
pip install io 
pip install django-rest-framework
pip install djangorestframework-simplejwt 
pip install corsheaders
pip install celery redis django-celery-beat
```

2. Install Redis:
```bash
sudo apt install redis-server
sudo service redis-server start
```

3. Start Celery workers:
```bash
celery -A datacenter_app worker --loglevel=info
celery -A datacenter_app beat --loglevel=info
```

## 🔄 Git Workflow

### Branch Strategy
- `main`: Production-ready code
- `experimental-branch`: Development and testing

### Development Process
1. Make changes in experimental branch
2. Test thoroughly
3. Commit with descriptive messages
4. Merge to main when stable

### Commit Message Format
```
Feature/Fix: Brief description
- Detailed point 1
- Detailed point 2
```

## 🎯 Current State

### Working Features
- ✅ Equipment management
- ✅ License tracking
- ✅ Excel import/export
- ✅ PDF generation
- ✅ Email notifications
- ✅ Enhanced error handling
- ✅ Detailed success messages

### Recent Improvements
- Enhanced notification system with emojis
- Fixed delete equipment functionality
- Improved error handling
- Better success messages
- Streamlined Git workflow

## 🔍 Code Structure

### Frontend Components
- `Datacenter.js`: Main component for equipment management
- `DatacenterSelection.js`: Datacenter selection interface
- `api.js`: API communication layer

### Backend Structure
- Django REST Framework views
- Celery tasks for background operations
- JWT authentication
- Redis for task queue

## 📝 Best Practices

### Code Organization
- Feature-based component structure
- Clear separation of concerns
- Consistent error handling
- Detailed logging

### Git Practices
- Descriptive commit messages
- Branch-based development
- Regular merges to main
- Clean commit history

## 🔐 Security Features
- JWT authentication
- CORS protection
- Secure password handling
- API endpoint protection

## 📈 Future Improvements
- Enhanced reporting
- Advanced filtering
- Batch operations
- Real-time updates

## 🚨 Error Handling
- Detailed error messages
- User-friendly notifications
- Proper error logging
- Graceful fallbacks

## 📧 Email System
- License expiration notifications
- PDF report delivery
- Custom email templates
- Error notifications

## 🔄 API Endpoints
- Equipment CRUD operations
- Data import/export
- PDF generation
- Email notifications

## 🛠️ Development Tools
- Django development server
- React development server
- Redis for task queue
- Celery for background tasks

## 📚 Documentation
- API documentation
- Component documentation
- Setup instructions
- Workflow guidelines

## 🔍 Testing
- Unit tests
- Integration tests
- API tests
- UI tests

## 🚀 Deployment
- Production configuration
- Environment variables
- Security settings
- Performance optimization

## 📞 Support
For any issues or questions, please contact the development team.

## 📄 License
This project is licensed under the MIT License.
