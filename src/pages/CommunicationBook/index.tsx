import React from 'react';
import { Box } from '@mui/material';
import PageHeader from '../../components/Common/PageHeader';
import CommunicationBook from '../../components/Communication/CommunicationBook';

const CommunicationBookPage = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader 
        title="Communication Book" 
        subtitle="Staff Communication Log"
        helpText="Use this page to maintain a digital log of staff communications and important updates."
      />
      <CommunicationBook />
    </Box>
  );
};

export default CommunicationBookPage;
