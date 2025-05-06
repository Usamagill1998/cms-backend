module.exports = {
    // Department types - will be expanded later to include LESCO and others
    departmentTypes: {
      HOUSING: 'housing_projects',
      LESCO: 'lesco'
    },
    
    // Complaint status types
    complaintStatus: {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      RESOLVED: 'resolved',
      CLOSED: 'closed',
      REJECTED: 'rejected'
    },
    
    // User roles
    userRoles :{
      USER: 'user',        // Regular users who submit complaints
      STAFF: 'staff',      // Department staff who handle complaints
      HOD: 'hod',          // Department heads who manage staff
      ADMIN: 'admin'       // System administrators
    },
    
    // File upload limits and configurations
    fileUpload: {
      maxFileSize: process.env.MAX_FILE_SIZE || 1048576, // 1MB in bytes
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf'
      ],
      s3FolderPaths: {
        idCards: 'id-cards/',
        documents: 'documents/',
        propertyProofs: 'property-proofs/',
        paymentReceipts: 'payment-receipts/'
      }
    }
  };