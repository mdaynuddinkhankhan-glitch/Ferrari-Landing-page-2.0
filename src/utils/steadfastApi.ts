// SteadFast Courier API Client
// Handles both local Vite server proxy and client-side failover with CORS proxy

export interface SteadfastBalanceResult {
  success: boolean;
  balance?: number;
  message?: string;
  statusCode?: number;
}

export interface SteadfastOrderPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
}

export interface SteadfastOrderResult {
  success: boolean;
  consignmentId?: string | number;
  trackingCode?: string;
  status?: string;
  message?: string;
}

/**
 * Fetch current wallet / COD balance from SteadFast Courier API
 */
export async function fetchSteadfastBalance(
  apiKey: string,
  secretKey: string
): Promise<SteadfastBalanceResult> {
  const cleanApiKey = (apiKey || '').trim();
  const cleanSecretKey = (secretKey || '').trim();

  if (!cleanApiKey || !cleanSecretKey) {
    return {
      success: false,
      message: 'Steadfast API Key এবং Secret Key প্রয়োজন।'
    };
  }

  // 1. Try local server proxy first
  try {
    const proxyRes = await fetch('/api/steadfast/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cleanApiKey, secretKey: cleanSecretKey }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.status === 200 && data.current_balance !== undefined) {
        return {
          success: true,
          balance: Number(data.current_balance),
          statusCode: 200,
        };
      }
      if (data.message) {
        return {
          success: false,
          message: data.message,
          statusCode: data.status,
        };
      }
    }
  } catch {
    // fall through to direct or CORS proxy
  }

  // 2. Direct fetch attempt
  try {
    const directRes = await fetch('https://portal.packzy.com/api/v1/get_balance', {
      method: 'GET',
      headers: {
        'Api-Key': cleanApiKey,
        'Secret-Key': cleanSecretKey,
        'Content-Type': 'application/json'
      }
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data.status === 200 && data.current_balance !== undefined) {
        return {
          success: true,
          balance: Number(data.current_balance),
          statusCode: 200,
        };
      }
      return {
        success: false,
        message: data.message || 'ব্যালেন্স পেতে সমস্যা হয়েছে।',
        statusCode: data.status,
      };
    } else {
      const errorData = await directRes.json().catch(() => null);
      if (errorData?.message) {
        return {
          success: false,
          message: errorData.message,
          statusCode: directRes.status,
        };
      }
    }
  } catch {
    // fall through to CORS proxy
  }

  // 3. Fallback via reliable CORS proxy for preview / client environments
  try {
    const targetUrl = 'https://portal.packzy.com/api/v1/get_balance';
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    
    const corsRes = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Api-Key': cleanApiKey,
        'Secret-Key': cleanSecretKey,
        'Content-Type': 'application/json'
      }
    });

    if (corsRes.ok) {
      const data = await corsRes.json();
      if (data.status === 200 && data.current_balance !== undefined) {
        return {
          success: true,
          balance: Number(data.current_balance),
          statusCode: 200,
        };
      }
      return {
        success: false,
        message: data.message || 'ভুল API Key বা Secret Key দেওয়া হয়েছে।',
        statusCode: data.status,
      };
    } else {
      const errorData = await corsRes.json().catch(() => null);
      if (errorData?.message) {
        return {
          success: false,
          message: errorData.message,
          statusCode: corsRes.status,
        };
      }
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Steadfast সার্ভারের সাথে কানেক্ট করা যায়নি। ইন্টারনেট ও API Key চেক করুন।'
    };
  }

  return {
    success: false,
    message: 'Steadfast সার্ভার থেকে কোনো রেসপন্স পাওয়া যায়নি।'
  };
}

/**
 * Dispatch an order to Steadfast Courier
 */
export async function createSteadfastConsignment(
  apiKey: string,
  secretKey: string,
  payload: SteadfastOrderPayload
): Promise<SteadfastOrderResult> {
  const cleanApiKey = (apiKey || '').trim();
  const cleanSecretKey = (secretKey || '').trim();

  if (!cleanApiKey || !cleanSecretKey) {
    return {
      success: false,
      message: 'Steadfast API Key এবং Secret Key দেওয়া হয়নি।'
    };
  }

  // 1. Try local server proxy first
  try {
    const proxyRes = await fetch('/api/steadfast/create_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: cleanApiKey,
        secretKey: cleanSecretKey,
        orderData: payload
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.status === 200 && data.consignment) {
        return {
          success: true,
          consignmentId: data.consignment.consignment_id,
          trackingCode: data.consignment.tracking_code,
          status: data.consignment.status || 'in_review',
          message: data.message || 'অর্ডার সফলভাবে Steadfast এ বুক করা হয়েছে!'
        };
      }
      return {
        success: false,
        message: data.message || (data.errors ? JSON.stringify(data.errors) : 'বুকিং ব্যর্থ হয়েছে।')
      };
    }
  } catch {
    // fall through
  }

  // 2. Direct fetch attempt
  try {
    const directRes = await fetch('https://portal.packzy.com/api/v1/create_order', {
      method: 'POST',
      headers: {
        'Api-Key': cleanApiKey,
        'Secret-Key': cleanSecretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await directRes.json();
    if (data.status === 200 && data.consignment) {
      return {
        success: true,
        consignmentId: data.consignment.consignment_id,
        trackingCode: data.consignment.tracking_code,
        status: data.consignment.status || 'in_review',
        message: data.message || 'অর্ডার সফলভাবে Steadfast এ বুক করা হয়েছে!'
      };
    }
    if (data.status && data.status !== 200) {
      return {
        success: false,
        message: data.message || (data.errors ? Object.values(data.errors).flat().join(', ') : 'বুকিং ব্যর্থ হয়েছে।')
      };
    }
  } catch {
    // fall through to CORS proxy
  }

  // 3. CORS proxy attempt
  try {
    const targetUrl = 'https://portal.packzy.com/api/v1/create_order';
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Api-Key': cleanApiKey,
        'Secret-Key': cleanSecretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.status === 200 && data.consignment) {
      return {
        success: true,
        consignmentId: data.consignment.consignment_id,
        trackingCode: data.consignment.tracking_code,
        status: data.consignment.status || 'in_review',
        message: data.message || 'অর্ডার সফলভাবে Steadfast এ বুক করা হয়েছে!'
      };
    }

    return {
      success: false,
      message: data.message || (data.errors ? Object.values(data.errors).flat().join(', ') : 'বুকিং ব্যর্থ হয়েছে।')
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'বুকিং করার সময় এরর হয়েছে।'
    };
  }
}

/**
 * Check delivery status of a consignment from SteadFast
 */
export async function fetchSteadfastDeliveryStatus(
  apiKey: string,
  secretKey: string,
  consignmentId?: string | number,
  trackingCode?: string
): Promise<{ success: boolean; status?: string; message?: string }> {
  const cleanApiKey = (apiKey || '').trim();
  const cleanSecretKey = (secretKey || '').trim();

  if (!cleanApiKey || !cleanSecretKey) {
    return { success: false, message: 'API credentials missing' };
  }

  // 1. Try local server proxy
  try {
    const proxyRes = await fetch('/api/steadfast/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: cleanApiKey,
        secretKey: cleanSecretKey,
        consignmentId,
        trackingCode
      })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.status === 200 && (data.delivery_status || data.consignment?.status || data.status_name)) {
        return {
          success: true,
          status: (data.delivery_status || data.consignment?.status || data.status_name || 'PENDING').toUpperCase()
        };
      }
    }
  } catch {
    // fall through
  }

  // 2. Direct fetch
  try {
    const targetUrl = trackingCode 
      ? `https://portal.packzy.com/api/v1/status_by_trackingcode/${trackingCode}`
      : `https://portal.packzy.com/api/v1/status_by_cid/${consignmentId}`;

    const res = await fetch(targetUrl, {
      headers: {
        'Api-Key': cleanApiKey,
        'Secret-Key': cleanSecretKey,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const st = data.delivery_status || data.consignment?.status || data.status_name || 'PENDING';
      return { success: true, status: String(st).toUpperCase() };
    }
  } catch {
    // fall through
  }

  return { success: false, message: 'স্ট্যাটাস পাওয়া যায়নি' };
}
