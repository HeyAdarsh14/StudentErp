# Dummy Payment Gateway Implementation

## Overview
This is a **DUMMY/SIMULATED** payment gateway implementation for development and testing purposes. It mimics the behavior of real payment gateways (Razorpay/Stripe) without actually processing real transactions.

**⚠️ IMPORTANT:** Replace this with actual payment gateway integration before deploying to production.

---

## Features

### ✅ Implemented
- Payment order creation
- Payment verification
- Payment capture simulation
- Refund processing simulation
- Payment link generation
- Webhook event simulation
- Transaction status tracking
- Receipt generation (PDF)
- Email notifications
- In-app notifications

### 🔄 Simulated Behaviors
- **Transaction delays:** Artificial delays (300-1000ms) to mimic real gateway latency
- **Success rate:** 95% success, 5% random failures for testing error handling
- **Transaction IDs:** Auto-generated unique IDs (ORDER_xxx, PAY_xxx, REFUND_xxx)
- **Webhook events:** Can be manually triggered for testing
- **In-memory storage:** Transactions stored in Map (not persistent)

---

## API Endpoints

### 1. Create Payment Order
**Endpoint:** `POST /api/payment/create-order`

**Request:**
```json
{
  "feeId": "65a7c8b4f8e4d12345678901"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created",
  "data": {
    "orderId": "ORDER_1707558000123",
    "amount": 50000,
    "currency": "INR",
    "key": "dummy_key_12345",
    "studentName": "John Doe",
    "feeDetails": {
      "id": "65a7c8b4f8e4d12345678901",
      "academicYear": "2025-26",
      "semester": 1,
      "totalAmount": 50000,
      "paidAmount": 0,
      "dueAmount": 50000
    }
  }
}
```

---

### 2. Verify Payment
**Endpoint:** `POST /api/payment/verify`

**Request:**
```json
{
  "orderId": "ORDER_1707558000123",
  "paymentId": "PAY_1707558001234",
  "signature": "dummy_signature_hash",
  "feeId": "65a7c8b4f8e4d12345678901",
  "amount": 5000000,
  "method": "card"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "paymentId": "PAY_1707558001234",
    "receiptNumber": "REC_1707558002345",
    "amount": 50000,
    "status": "success",
    "receiptUrl": "/uploads/reports/fee-receipt-xxx.pdf",
    "updatedFee": {
      "totalAmount": 50000,
      "paidAmount": 50000,
      "dueAmount": 0,
      "status": "paid"
    }
  }
}
```

**Side Effects:**
- Updates fee record with payment details
- Generates PDF receipt
- Sends email notification
- Creates in-app notification

---

### 3. Simulate Payment (Testing Only)
**Endpoint:** `POST /api/payment/simulate`

**Request:**
```json
{
  "feeId": "65a7c8b4f8e4d12345678901",
  "amount": 50000,
  "method": "card",
  "status": "success"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment simulated",
  "data": {
    "success": true,
    "paymentId": "PAY_1707558003456",
    "orderId": "ORDER_1707558004567",
    "amount": 50000,
    "status": "success",
    "method": "card"
  },
  "instructions": "Use this paymentId and orderId to verify payment"
}
```

**Usage:** Generate test payment credentials without going through create-order flow.

---

### 4. Payment Webhook
**Endpoint:** `POST /api/payment/webhook`

**Request:**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "PAY_1707558003456",
        "order_id": "ORDER_1707558004567",
        "amount": 5000000,
        "status": "captured",
        "method": "card"
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "received": true
}
```

**Note:** Webhook always returns 200 OK to prevent retries.

---

### 5. Initiate Refund
**Endpoint:** `POST /api/payment/refund`

**Request:**
```json
{
  "paymentId": "PAY_1707558003456",
  "amount": 50000,
  "reason": "Course cancellation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Refund initiated successfully",
  "data": {
    "success": true,
    "refundId": "REFUND_1707558005678",
    "paymentId": "PAY_1707558003456",
    "amount": 5000000,
    "status": "processed"
  }
}
```

---

### 6. Get Payment Status
**Endpoint:** `GET /api/payment/status/:paymentId`

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "PAY_1707558003456",
    "orderId": "ORDER_1707558004567",
    "amount": 5000000,
    "method": "card",
    "status": "success",
    "processedAt": "2026-02-10T10:30:00.000Z"
  }
}
```

---

### 7. Generate Payment Link
**Endpoint:** `POST /api/payment/generate-link`

**Request:**
```json
{
  "feeId": "65a7c8b4f8e4d12345678901"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment link generated",
  "data": {
    "success": true,
    "linkId": "LINK_1707558006789",
    "shortUrl": "https://dummy-payment.gateway/pay/LINK_1707558006789",
    "expiresAt": "2026-02-11T10:30:00.000Z"
  }
}
```

---

## Testing Workflow

### Complete Payment Flow

1. **Create Order**
```bash
curl -X POST http://localhost:5000/api/payment/create-order \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feeId": "FEE_ID_HERE"}'
```

2. **Simulate Payment (Frontend would handle actual payment)**
```bash
curl -X POST http://localhost:5000/api/payment/simulate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feeId": "FEE_ID_HERE",
    "amount": 50000,
    "method": "card",
    "status": "success"
  }'
```

3. **Verify Payment**
```bash
curl -X POST http://localhost:5000/api/payment/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_FROM_STEP2",
    "paymentId": "PAY_FROM_STEP2",
    "signature": "dummy_sig",
    "feeId": "FEE_ID_HERE",
    "amount": 5000000,
    "method": "card"
  }'
```

4. **Check Fee Status**
```bash
curl -X GET http://localhost:5000/api/fees/FEE_ID_HERE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Fee Management Endpoints

### 1. Bulk Create Fees
**Endpoint:** `POST /api/fee-management/bulk-create`

**Request:**
```json
{
  "department": "65a7c8b4f8e4d12345678901",
  "year": 1,
  "semester": 1,
  "academicYear": "2025-26",
  "feeStructure": {
    "tuitionFee": 40000,
    "libraryFee": 2000,
    "laboratoryFee": 5000,
    "examFee": 1000,
    "sportsFee": 1000,
    "developmentFee": 1000
  },
  "dueDate": "2026-03-31"
}
```

---

### 2. Apply Scholarship
**Endpoint:** `POST /api/fee-management/scholarship`

**Request:**
```json
{
  "feeId": "65a7c8b4f8e4d12345678901",
  "discountType": "percentage",
  "discountValue": 25,
  "reason": "Merit scholarship",
  "approvedBy": "ADMIN_ID"
}
```

---

### 3. Send Fee Reminders
**Endpoint:** `POST /api/fee-management/send-reminders?department=DEPT_ID`

**Response:**
```json
{
  "success": true,
  "message": "Fee reminders sent to 45 students",
  "data": {
    "sent": 45,
    "failed": 2,
    "errors": []
  }
}
```

---

### 4. Get Fee Defaulters
**Endpoint:** `GET /api/fee-management/defaulters?department=DEPT_ID&year=1`

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDefaulters": 12,
      "totalOutstanding": 450000
    },
    "defaulters": [
      {
        "studentName": "John Doe",
        "registrationNumber": "STU123456",
        "department": "Computer Science",
        "year": 1,
        "contactNumber": "9876543210",
        "email": "john@example.com",
        "dueAmount": 50000,
        "dueDate": "2026-01-31",
        "daysPastDue": 10
      }
    ]
  }
}
```

---

### 5. Fee Collection Report
**Endpoint:** `GET /api/fee-management/collection-report?startDate=2026-01-01&endDate=2026-02-10`

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalFees": 150,
      "totalExpected": 7500000,
      "totalCollected": 6000000,
      "totalPending": 1500000
    },
    "breakdown": [
      {
        "_id": "paid",
        "count": 100,
        "totalAmount": 5000000,
        "paidAmount": 5000000,
        "dueAmount": 0
      },
      {
        "_id": "pending",
        "count": 50,
        "totalAmount": 2500000,
        "paidAmount": 1000000,
        "dueAmount": 1500000
      }
    ]
  }
}
```

---

## Simulated Behaviors

### Success/Failure Rates
- **95% success:** Most payments succeed
- **5% failure:** Random failures with error messages like:
  - "Payment declined by bank"
  - "Insufficient funds"
  - "Card authentication failed"

### Transaction States
1. **created** - Order created, payment pending
2. **success** - Payment successful
3. **failed** - Payment failed
4. **captured** - Payment captured (for authorized payments)
5. **refunded** - Payment refunded

### Delays
- Order creation: 500ms
- Signature verification: 300ms
- Payment processing: 1000ms
- Refund processing: 800ms

---

## Integration with Real Gateway

### Replace Dummy with Razorpay

**Step 1:** Install Razorpay SDK
```bash
npm install razorpay
```

**Step 2:** Update `payment.service.js`
```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createPaymentOrder = async (orderData) => {
  const options = {
    amount: orderData.amount,
    currency: orderData.currency,
    receipt: `receipt_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);
  return order;
};
```

**Step 3:** Update webhook verification
```javascript
const crypto = require('crypto');

const verifyPaymentSignature = (paymentData) => {
  const { orderId, paymentId, signature } = paymentData;
  const body = orderId + '|' + paymentId;
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  
  return {
    success: true,
    verified: signature === expectedSignature,
  };
};
```

---

## Automated Tasks (Cron Jobs)

See `src/utils/cronJobs.js` for scheduled tasks:

1. **Fee Reminders** - Daily at 9:00 AM
   - Sends reminders for fees due in 3 days

2. **Mark Overdue** - Daily at 12:00 AM
   - Marks fees past due date as overdue

3. **Apply Late Fees** - Daily at 1:00 AM
   - Applies 2% late fee or minimum ₹500 after 7 days

---

## Security Considerations

### For Production
- [ ] Implement proper webhook signature verification
- [ ] Use HTTPS for all payment endpoints
- [ ] Store transaction logs in database (not in-memory)
- [ ] Implement idempotency for payment verification
- [ ] Add rate limiting on payment endpoints
- [ ] Encrypt sensitive payment data
- [ ] Implement PCI-DSS compliance if storing card data
- [ ] Add fraud detection mechanisms
- [ ] Implement payment reconciliation
- [ ] Setup monitoring and alerts for failed payments

---

## Testing Checklist

- [ ] Create payment order
- [ ] Simulate successful payment
- [ ] Simulate failed payment
- [ ] Verify payment and update fee record
- [ ] Generate receipt PDF
- [ ] Send email notification
- [ ] Create in-app notification
- [ ] Test refund flow
- [ ] Test payment link generation
- [ ] Test webhook handling
- [ ] Bulk create fees for batch
- [ ] Apply scholarship/discount
- [ ] Send fee reminders
- [ ] Get fee defaulters list
- [ ] Generate collection report
- [ ] Waive fee

---

## Notes

- Amount is stored in **paisa** (smallest unit): ₹1 = 100 paisa
- All timestamps are ISO 8601 format
- Transaction IDs are unique and auto-generated
- Receipts are stored in `uploads/reports/` directory
- Email notifications require SMTP configuration
- In-memory storage is cleared on server restart

**Remember:** This is a **DUMMY** implementation for development. Replace with actual payment gateway before production deployment!
