// Background Service Worker for Facebook Marketplace Auto Reposter

// تثبيت الإضافة
chrome.runtime.onInstalled.addListener(() => {
  console.log('Facebook Marketplace Auto Reposter installed');
});

// التعامل مع الرسائل من content script و popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'openMarketplace':
      openMarketplacePage();
      break;
    case 'openSellPage':
      openSellPage();
      break;
    case 'getListings':
      handleGetListings(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    case 'repostListing':
      handleRepostListing(request, sender, sendResponse);
      return true;
    default:
      console.log('Unknown action:', request.action);
  }
});

// فتح صفحة Marketplace
async function openMarketplacePage() {
  try {
    const tab = await chrome.tabs.create({
      url: 'https://web.facebook.com/marketplace/cairo/propertyforsale?locale=ar_AR',
      active: true
    });
    
    // انتظار تحميل الصفحة ثم حقن content script
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      }
    });
  } catch (error) {
    console.error('Error opening marketplace page:', error);
  }
}

// فتح صفحة البيع
async function openSellPage() {
  try {
    await chrome.tabs.create({
      url: 'https://web.facebook.com/marketplace/create/item',
      active: true
    });
  } catch (error) {
    console.error('Error opening sell page:', error);
  }
}

// التعامل مع طلب الحصول على الإعلانات
async function handleGetListings(request, sender, sendResponse) {
  try {
    // إرسال رسالة إلى content script للحصول على الإعلانات
    const response = await chrome.tabs.sendMessage(sender.tab.id, {
      action: 'extractListings'
    });
    sendResponse(response);
  } catch (error) {
    console.error('Error getting listings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// التعامل مع إعادة النشر
async function handleRepostListing(request, sender, sendResponse) {
  try {
    const { listing, delay } = request;
    
    // فتح صفحة بيع جديدة (مرئية للمستخدم)
    const tab = await chrome.tabs.create({
      url: 'https://web.facebook.com/marketplace/create/item',
      active: true  // جعل التاب مرئي
    });
    
    // حفظ معلومات الإعلان في storage للوصول إليها من التاب الجديد
    await chrome.storage.local.set({
      currentListing: listing,
      repostTabId: tab.id,
      repostInProgress: true
    });
    
    // انتظار تحميل الصفحة مع timeout ومعالجة أخطاء
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          reject(new Error('انتهت مهلة انتظار تحميل الصفحة'));
        }, 20000); // 20 ثانية timeout
        
        function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(resolve, 5000); // انتظار أطول للتأكد من تحميل العناصر
          }
        }
        
        chrome.tabs.onUpdated.addListener(listener);
        
        // فحص فوري إذا كانت الصفحة محملة بالفعل
        chrome.tabs.get(tab.id, (currentTab) => {
          if (chrome.runtime.lastError) {
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(listener);
            reject(new Error('التاب لم يعد موجوداً'));
            return;
          }
          
          if (currentTab.status === 'complete') {
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(resolve, 5000);
          }
        });
      });
    } catch (error) {
      console.error('Error waiting for page load:', error);
      sendResponse({ success: false, error: error.message });
      return;
    }
    
    // التحقق من وجود التاب
    const tabExists = await checkTabExists(tab.id);
    if (!tabExists) {
      sendResponse({ success: false, error: 'التاب لم يعد موجوداً' });
      return;
    }
    
    // حقن content script
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      console.error('Error injecting content script:', error);
      sendResponse({ success: false, error: 'فشل في حقن السكريبت' });
      return;
    }
    
    // انتظار قليل للتأكد من تحميل السكريبت
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // إرسال بيانات الإعلان للنشر مع معالجة الأخطاء
    try {
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: 'fillListingForm',
        listing: listing
      });
      
      sendResponse(result);
    } catch (error) {
      console.error('Error sending message to tab:', error);
      sendResponse({ success: false, error: 'فشل في التواصل مع التاب الجديد - تأكد من أن الصفحة محملة' });
    }
    
    // لا نغلق التاب تلقائياً - نتركه للمستخدم
    // setTimeout(() => {
    //   chrome.tabs.remove(tab.id);
    // }, delay || 5000);
    
  } catch (error) {
    console.error('Error reposting listing:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// حفظ البيانات في التخزين المحلي
async function saveToStorage(key, data) {
  try {
    await chrome.storage.local.set({ [key]: data });
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

// قراءة البيانات من التخزين المحلي
async function getFromStorage(key) {
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  } catch (error) {
    console.error('Error reading from storage:', error);
    return null;
  }
}

// التحقق من وجود التاب
async function checkTabExists(tabId) {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch (error) {
    console.error('Tab does not exist:', tabId);
    return false;
  }
}