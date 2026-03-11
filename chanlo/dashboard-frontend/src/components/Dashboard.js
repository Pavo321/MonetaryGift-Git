import React from 'react';
import './Dashboard.css';

function Dashboard({ data }) {
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      SUCCESS: { label: 'Received', className: 'status-success' },
      PENDING: { label: 'Pending', className: 'status-pending' },
      FAILED: { label: 'Failed', className: 'status-failed' },
      REFUNDED: { label: 'Refunded', className: 'status-refunded' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'status-default' };
    return <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome, {data.hostName}</h1>
        <p className="subtitle">Your Payment Dashboard</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon received-icon">₹</div>
          <div className="stat-content">
            <span className="stat-value">{formatAmount(data.totalAmountReceived)}</span>
            <span className="stat-label">Total Received</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-value">{formatAmount(data.pendingAmount)}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success-icon">✓</div>
          <div className="stat-content">
            <span className="stat-value">{data.successfulPayments}</span>
            <span className="stat-label">Successful Payments</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon total-icon">#</div>
          <div className="stat-content">
            <span className="stat-value">{data.totalPayments}</span>
            <span className="stat-label">Total Payments</span>
          </div>
        </div>
      </div>

      <div className="payments-section">
        <h2>Payment Details</h2>

        {data.payments && data.payments.length > 0 ? (
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Village</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment, index) => (
                  <tr key={payment.hisabId || index} className={payment.status === 'SUCCESS' ? 'row-success' : ''}>
                    <td className="guest-name">{payment.guestName || 'N/A'}</td>
                    <td className="village">{payment.guestVillage || '-'}</td>
                    <td className="amount">{formatAmount(payment.amount)}</td>
                    <td className="date">{formatDate(payment.completedAt || payment.createdAt)}</td>
                    <td className="status">{getStatusBadge(payment.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-payments">
            <p>No payments yet. Share your event QR code to start receiving gifts!</p>
          </div>
        )}
      </div>

      <footer className="dashboard-footer">
        <p>Powered by Chanlo</p>
      </footer>
    </div>
  );
}

export default Dashboard;
