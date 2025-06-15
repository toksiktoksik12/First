// Content Script for Facebook Marketplace Auto Reposter

// متغيرات عامة
let isExtractingListings = false;
let extractedListings = [];

// الاستماع للرسائل من background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'extractListings':
      extractListings().then(sendResponse);
      return true; // Keep message channel open for async response
    case 'fillListingForm':
      fillListingForm(request.listing).then(sendResponse);
      return true;
    default:
      console.log('Unknown action in content script:', request.action);
  }
});

// استخراج الإعلانات من صفحة Marketplace
async function extractListings() {
  try {
    console.log('بدء استخراج الإعلانات...');
    isExtractingListings = true;
    extractedListings = [];
    
    // انتظار تحميل الصفحة
    await waitForPageLoad();
    
    // البحث عن عناصر الإعلانات
    const listingSelectors = [
      '[data-pagelet="MarketplaceSearchResults"] a[href*="/marketplace/item/"]',
      '[role="main"] a[href*="/marketplace/item/"]',
      'a[href*="/marketplace/item/"]'
    ];
    
    let listingElements = [];
    for (const selector of listingSelectors) {
      listingElements = document.querySelectorAll(selector);
      if (listingElements.length > 0) break;
    }
    
    console.log(`تم العثور على ${listingElements.length} إعلان`);
    
    if (listingElements.length === 0) {
      return { success: false, message: 'لم يتم العثور على إعلانات في الصفحة' };
    }
    
    // استخراج بيانات كل إعلان
    for (let i = 0; i < Math.min(listingElements.length, 20); i++) {
      const element = listingElements[i];
      try {
        const listing = await extractListingData(element);
        if (listing) {
          extractedListings.push(listing);
        }
      } catch (error) {
        console.error(`خطأ في استخراج الإعلان ${i}:`, error);
      }
      
      // فاصل زمني قصير بين الإعلانات
      await sleep(500);
    }
    
    console.log(`تم استخراج ${extractedListings.length} إعلان بنجاح`);
    isExtractingListings = false;
    
    return { 
      success: true, 
      listings: extractedListings,
      count: extractedListings.length 
    };
    
  } catch (error) {
    console.error('خطأ في استخراج الإعلانات:', error);
    isExtractingListings = false;
    return { success: false, error: error.message };
  }
}

// استخراج بيانات إعلان واحد
async function extractListingData(element) {
  try {
    const listing = {
      id: Date.now() + Math.random(),
      title: '',
      description: '',
      price: '',
      location: '',
      images: [],
      url: ''
    };
    
    // الحصول على الرابط
    listing.url = element.href || element.getAttribute('href');
    if (listing.url && !listing.url.startsWith('http')) {
      listing.url = 'https://web.facebook.com' + listing.url;
    }
    
    // البحث عن العنوان
    const titleSelectors = [
      'span[dir="auto"]',
      '[data-testid="marketplace-listing-title"]',
      'span',
      'div span'
    ];
    
    for (const selector of titleSelectors) {
      const titleElement = element.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        listing.title = titleElement.textContent.trim();
        break;
      }
    }
    
    // البحث عن السعر
    const priceSelectors = [
      'span[dir="auto"]:not(:first-child)',
      '[data-testid="marketplace-listing-price"]',
      'span[style*="font-weight"]'
    ];
    
    for (const selector of priceSelectors) {
      const priceElements = element.querySelectorAll(selector);
      for (const priceElement of priceElements) {
        const text = priceElement.textContent.trim();
        if (text.includes('جنيه') || text.includes('EGP') || text.includes('ج.م') || /\d+/.test(text)) {
          listing.price = text;
          break;
        }
      }
      if (listing.price) break;
    }
    
    // البحث عن الصور
    const imageSelectors = [
      'img[src*="scontent"]',
      'img[src*="fbcdn"]',
      'img'
    ];
    
    for (const selector of imageSelectors) {
      const imgElement = element.querySelector(selector);
      if (imgElement && imgElement.src && !imgElement.src.includes('data:')) {
        listing.images.push(imgElement.src);
        break;
      }
    }
    
    // البحث عن الموقع
    const locationSelectors = [
      'span[dir="auto"]:last-child',
      '[data-testid="marketplace-listing-location"]'
    ];
    
    for (const selector of locationSelectors) {
      const locationElement = element.querySelector(selector);
      if (locationElement && locationElement.textContent.trim() && 
          !locationElement.textContent.includes('جنيه') && 
          !locationElement.textContent.includes('EGP')) {
        listing.location = locationElement.textContent.trim();
        break;
      }
    }
    
    // التحقق من وجود بيانات أساسية
    if (!listing.title && !listing.price) {
      return null;
    }
    
    // إضافة وصف افتراضي إذا لم يكن موجود
    if (!listing.description) {
      listing.description = listing.title || 'عقار للبيع';
    }
    
    console.log('تم استخراج إعلان:', listing.title);
    return listing;
    
  } catch (error) {
    console.error('خطأ في استخراج بيانات الإعلان:', error);
    return null;
  }
}

// ملء نموذج إعلان جديد
async function fillListingForm(listing) {
  try {
    console.log('بدء ملء النموذج للإعلان:', listing.title);
    
    // انتظار تحميل النموذج
    await waitForElement('input[placeholder*="title"], input[placeholder*="عنوان"], [data-testid="marketplace-composer-title-input"]', 10000);
    
    // ملء العنوان
    await fillField([
      'input[placeholder*="title"]',
      'input[placeholder*="عنوان"]',
      '[data-testid="marketplace-composer-title-input"]',
      'input[type="text"]:first-of-type'
    ], listing.title);
    
    await sleep(1000);
    
    // ملء الوصف
    await fillField([
      'textarea[placeholder*="description"]',
      'textarea[placeholder*="وصف"]',
      '[data-testid="marketplace-composer-description-input"]',
      'textarea'
    ], listing.description);
    
    await sleep(1000);
    
    // ملء السعر
    if (listing.price) {
      const priceValue = listing.price.replace(/[^\d]/g, '');
      if (priceValue) {
        await fillField([
          'input[placeholder*="price"]',
          'input[placeholder*="سعر"]',
          '[data-testid="marketplace-composer-price-input"]',
          'input[type="number"]'
        ], priceValue);
      }
    }
    
    await sleep(1000);
    
    // ملء الموقع
    if (listing.location) {
      await fillField([
        'input[placeholder*="location"]',
        'input[placeholder*="موقع"]',
        '[data-testid="marketplace-composer-location-input"]'
      ], listing.location);
    }
    
    await sleep(1000);
    
    // رفع الصور
    if (listing.images && listing.images.length > 0) {
      await uploadImages(listing.images);
    }
    
    await sleep(2000);
    
    // النقر على زر النشر
    await clickPublishButton();
    
    return { success: true, message: 'تم نشر الإعلان بنجاح' };
    
  } catch (error) {
    console.error('خطأ في ملء النموذج:', error);
    return { success: false, error: error.message };
  }
}

// ملء حقل نص
async function fillField(selectors, value) {
  if (!value) return;
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // مسح المحتوى الحالي
      element.focus();
      element.select();
      document.execCommand('delete');
      
      // كتابة القيمة الجديدة
      element.value = value;
      
      // إطلاق الأحداث
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log(`تم ملء الحقل: ${selector} = ${value}`);
      return true;
    }
  }
  
  console.warn('لم يتم العثور على الحقل:', selectors);
  return false;
}

// رفع الصور
async function uploadImages(imageUrls) {
  try {
    // البحث عن زر رفع الصور
    const uploadSelectors = [
      'input[type="file"][accept*="image"]',
      '[data-testid="marketplace-composer-media-upload"]',
      'input[accept*="image"]'
    ];
    
    let uploadInput = null;
    for (const selector of uploadSelectors) {
      uploadInput = document.querySelector(selector);
      if (uploadInput) break;
    }
    
    if (!uploadInput) {
      console.warn('لم يتم العثور على حقل رفع الصور');
      return;
    }
    
    // تحميل الصور وتحويلها إلى ملفات
    const files = [];
    for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
      try {
        const file = await downloadImageAsFile(imageUrls[i], `image_${i}.jpg`);
        if (file) {
          files.push(file);
        }
      } catch (error) {
        console.error(`خطأ في تحميل الصورة ${i}:`, error);
      }
    }
    
    if (files.length > 0) {
      // إنشاء FileList
      const dt = new DataTransfer();
      files.forEach(file => dt.items.add(file));
      uploadInput.files = dt.files;
      
      // إطلاق حدث التغيير
      uploadInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log(`تم رفع ${files.length} صورة`);
    }
    
  } catch (error) {
    console.error('خطأ في رفع الصور:', error);
  }
}

// تحميل صورة وتحويلها إلى ملف
async function downloadImageAsFile(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  } catch (error) {
    console.error('خطأ في تحميل الصورة:', error);
    return null;
  }
}

// النقر على زر النشر
async function clickPublishButton() {
  const publishSelectors = [
    'button[type="submit"]',
    'button:contains("نشر")',
    'button:contains("Publish")',
    '[data-testid="marketplace-composer-publish-button"]',
    'button[aria-label*="نشر"]',
    'button[aria-label*="Publish"]'
  ];
  
  for (const selector of publishSelectors) {
    const button = document.querySelector(selector);
    if (button && !button.disabled) {
      button.click();
      console.log('تم النقر على زر النشر');
      return true;
    }
  }
  
  // البحث بالنص
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const text = button.textContent.trim().toLowerCase();
    if (text.includes('نشر') || text.includes('publish') || text.includes('post')) {
      if (!button.disabled) {
        button.click();
        console.log('تم النقر على زر النشر (بالنص)');
        return true;
      }
    }
  }
  
  console.warn('لم يتم العثور على زر النشر');
  return false;
}

// انتظار تحميل الصفحة
async function waitForPageLoad() {
  return new Promise(resolve => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// انتظار ظهور عنصر
async function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${selector}`));
    }, timeout);
  });
}

// دالة النوم
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// تهيئة content script
console.log('Facebook Marketplace Auto Reposter Content Script loaded');