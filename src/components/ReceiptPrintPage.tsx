import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { formatCurrency } from '../utils/currency';

interface ReceiptPrintPageProps {
  receiptData: any;
}

const ReceiptPrintPage: React.FC<ReceiptPrintPageProps> = ({ receiptData }) => {
  useEffect(() => {
    // Auto-trigger print dialog when component mounts
    const timer = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!receiptData) {
    return <Typography>No receipt data available</Typography>;
  }

  return (
    <Box sx={{
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      padding: '20mm',
      backgroundColor: 'white',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12pt',
      color: 'black',
      '@media print': {
        margin: 0,
        padding: '20mm',
        boxShadow: 'none',
        fontSize: '11pt'
      },
      '@media screen': {
        border: '1px solid #ccc',
        marginTop: '20px',
        marginBottom: '20px',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
      }
    }}>
      {/* Government Headers */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ fontSize: '18pt', mb: 1 }}>
          {receiptData.government_header}
        </Typography>
        <Typography variant="h5" gutterBottom sx={{ fontSize: '16pt', mb: 1 }}>
          {receiptData.department_header}
        </Typography>
        <Typography variant="h6" gutterBottom sx={{ fontSize: '14pt', mb: 2 }}>
          {receiptData.office_header}
        </Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ 
          fontSize: '16pt', 
          mt: 2, 
          mb: 3,
          border: '2px solid black',
          padding: '8px',
          backgroundColor: '#f5f5f5'
        }}>
          {receiptData.receipt_title}
        </Typography>
      </Box>

      {/* Receipt Details */}
      <Box display="flex" justifyContent="space-between" mb={3} sx={{ 
        borderBottom: '1px solid #ccc',
        paddingBottom: '10px'
      }}>
        <Box>
          <Typography sx={{ fontSize: '11pt', mb: 0.5 }}>
            <strong>Receipt No:</strong> {receiptData.receipt_number}
          </Typography>
          <Typography sx={{ fontSize: '11pt' }}>
            <strong>Transaction No:</strong> {receiptData.transaction_number}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography sx={{ fontSize: '11pt', mb: 0.5 }}>
            <strong>Date:</strong> {receiptData.date}
          </Typography>
          <Typography sx={{ fontSize: '11pt' }}>
            <strong>Location:</strong> {receiptData.location}
          </Typography>
        </Box>
      </Box>

      {/* Person Details */}
      <Box mb={3} p={2} border={1} borderColor="black" sx={{ backgroundColor: '#f9f9f9' }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: '14pt', mb: 1 }}>
          Customer Information
        </Typography>
        <Typography sx={{ fontSize: '11pt', mb: 0.5 }}>
          <strong>Name:</strong> {receiptData.person_name}
        </Typography>
        <Typography sx={{ fontSize: '11pt' }}>
          <strong>ID Number:</strong> {receiptData.person_id}
        </Typography>
      </Box>

      {/* Payment Items Table */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: '14pt', mb: 2 }}>
          Payment Details
        </Typography>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          border: '1px solid black'
        }}>
          <thead>
            <tr style={{ 
              backgroundColor: '#e0e0e0',
              borderBottom: '2px solid black'
            }}>
              <th style={{ 
                textAlign: 'left', 
                padding: '12px 8px',
                border: '1px solid black',
                fontSize: '11pt',
                fontWeight: 'bold'
              }}>
                Description
              </th>
              <th style={{ 
                textAlign: 'right', 
                padding: '12px 8px',
                border: '1px solid black',
                fontSize: '11pt',
                fontWeight: 'bold'
              }}>
                Amount ({receiptData.currency})
              </th>
            </tr>
          </thead>
          <tbody>
            {receiptData.items.map((item: any, index: number) => (
              <tr key={index}>
                <td style={{ 
                  padding: '10px 8px',
                  border: '1px solid black',
                  fontSize: '11pt'
                }}>
                  {item.description}
                </td>
                <td style={{ 
                  padding: '10px 8px', 
                  textAlign: 'right',
                  border: '1px solid black',
                  fontSize: '11pt'
                }}>
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ 
              backgroundColor: '#f0f0f0',
              borderTop: '2px solid black', 
              fontWeight: 'bold'
            }}>
              <td style={{ 
                padding: '12px 8px',
                border: '1px solid black',
                fontSize: '12pt',
                fontWeight: 'bold'
              }}>
                TOTAL
              </td>
              <td style={{ 
                padding: '12px 8px', 
                textAlign: 'right',
                border: '1px solid black',
                fontSize: '12pt',
                fontWeight: 'bold'
              }}>
                {formatCurrency(receiptData.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Box>

      {/* Payment Method */}
      <Box mb={4} p={2} sx={{ backgroundColor: '#f9f9f9', border: '1px solid #ccc' }}>
        <Typography sx={{ fontSize: '11pt', mb: 0.5 }}>
          <strong>Payment Method:</strong> {receiptData.payment_method}
        </Typography>
        {receiptData.payment_reference && (
          <Typography sx={{ fontSize: '11pt', mb: 0.5 }}>
            <strong>Reference:</strong> {receiptData.payment_reference}
          </Typography>
        )}
        <Typography sx={{ fontSize: '11pt' }}>
          <strong>Processed By:</strong> {receiptData.processed_by}
        </Typography>
      </Box>

      {/* Footer */}
      <Box mt={4} textAlign="center" sx={{ 
        borderTop: '1px solid #ccc',
        paddingTop: '15px'
      }}>
        <Typography variant="body2" gutterBottom sx={{ fontSize: '10pt', mb: 1 }}>
          {receiptData.footer}
        </Typography>
        <Typography variant="body2" gutterBottom sx={{ fontSize: '10pt', mb: 1 }}>
          {receiptData.validity_note}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '10pt' }}>
          {receiptData.contact_info}
        </Typography>
      </Box>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          * {
            color: black !important;
            background: white !important;
          }
          
          table, th, td {
            border: 1px solid black !important;
          }
          
          .MuiBox-root {
            break-inside: avoid;
          }
        }
      `}</style>
    </Box>
  );
};

export default ReceiptPrintPage; 