// Content Script for Facebook Marketplace Auto Reposter

// متغيرات عامة - تجنب التكرار
if (typeof window.isExtractingListings === 'undefined') {
  window.isExtractingListings = false;
}
if (typeof window.extractedListings === 'undefined') {
  window.extractedListings = [];
}

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
    window.isExtractingListings = true;
    window.extractedListings = [];
    
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
          window.extractedListings.push(listing);
        }
      } catch (error) {
        console.error(`خطأ في استخراج الإعلان ${i}:`, error);
      }
      
      // فاصل زمني قصير بين الإعلانات
      await sleep(500);
    }
    
    console.log(`تم استخراج ${window.extractedListings.length} إعلان بنجاح`);
    window.isExtractingListings = false;
    
    return { 
      success: true, 
      listings: window.extractedListings,
      count: window.extractedListings.length 
    };
    
  } catch (error) {
    console.error('خطأ في استخراج الإعلانات:', error);
    window.isExtractingListings = false;
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
    
    // انتظار تحميل النموذج - البحث عن أي حقل إدخال
    console.log('🔍 البحث عن نموذج النشر...');
    
    // انتظار أطول وبحث أوسع
    await waitForElement('input, textarea, form', 15000);
    
    // طباعة جميع الحقول المتاحة للتشخيص
    const allInputs = document.querySelectorAll('input, textarea');
    console.log('📋 الحقول المتاحة:', allInputs.length);
    allInputs.forEach((input, index) => {
      console.log(`${index}: ${input.tagName} - placeholder: "${input.placeholder}" - type: "${input.type}"`);
    });
    
    // ملء العنوان - محاولة أكثر مرونة
    console.log('📝 ملء العنوان:', listing.title);
    
    // البحث عن حقل العنوان بطرق متعددة
    const titleSelectors = [
      // Facebook selectors
      'input[placeholder*="title"]',
      'input[placeholder*="Title"]', 
      'input[placeholder*="عنوان"]',
      'input[placeholder*="What are you selling"]',
      'input[placeholder*="ما الذي تبيعه"]',
      '[data-testid*="title"]',
      '[data-testid*="marketplace"]',
      '[aria-label*="title"]',
      '[aria-label*="Title"]',
      '[aria-label*="عنوان"]',
      // عام
      'input[type="text"]:not([readonly]):not([disabled]):not([style*="display: none"])',
      'form input[type="text"]:first-of-type',
      'div[role="main"] input[type="text"]:first-of-type'
    ];
    
    await fillField(titleSelectors, listing.title);
    
    await sleep(1000);
    
    // ملء الوصف
    console.log('📝 ملء الوصف:', listing.description?.substring(0, 50) + '...');
    await fillField([
      'textarea[placeholder*="description"]',
      'textarea[placeholder*="وصف"]',
      'textarea[placeholder*="Description"]',
      '[data-testid="marketplace-composer-description-input"]',
      '[aria-label*="description"]',
      '[aria-label*="وصف"]',
      'textarea:not([readonly]):not([disabled])'
    ], listing.description);
    
    await sleep(1000);
    
    // ملء السعر
    if (listing.price) {
      const priceValue = listing.price.replace(/[^\d]/g, '');
      if (priceValue) {
        console.log('💰 ملء السعر:', priceValue);
        await fillField([
          'input[placeholder*="price"]',
          'input[placeholder*="سعر"]',
          'input[placeholder*="Price"]',
          '[data-testid="marketplace-composer-price-input"]',
          '[aria-label*="price"]',
          '[aria-label*="سعر"]',
          'input[type="number"]:not([readonly]):not([disabled])'
        ], priceValue);
      }
    }
    
    await sleep(1000);
    
    // ملء الموقع
    if (listing.location) {
      console.log('📍 ملء الموقع:', listing.location);
      await fillField([
        'input[placeholder*="location"]',
        'input[placeholder*="موقع"]',
        'input[placeholder*="Location"]',
        '[data-testid="marketplace-composer-location-input"]',
        '[aria-label*="location"]',
        '[aria-label*="موقع"]'
      ], listing.location);
    }
    
    await sleep(1000);
    
    // رفع الصور
    if (listing.images && listing.images.length > 0) {
      await uploadImages(listing.images);
    }
    
    await sleep(2000);
    
    // النقر على زر النشر
    const publishClicked = await clickPublishButton();
    
    if (!publishClicked) {
      return { success: false, message: 'لم يتم العثور على زر النشر' };
    }
    
    // انتظار والتحقق من نجاح النشر
    await sleep(3000);
    const publishSuccess = await verifyPublishSuccess();
    
    if (publishSuccess) {
      return { success: true, message: 'تم نشر الإعلان بنجاح ✅' };
    } else {
      return { success: false, message: 'فشل في نشر الإعلان - يرجى المحاولة يدوياً' };
    }
    
  } catch (error) {
    console.error('خطأ في ملء النموذج:', error);
    return { success: false, error: error.message };
  }
}

// ملء حقل نص
async function fillField(selectors, value) {
  if (!value) return false;
  
  console.log(`🔍 البحث عن حقل لملء: "${value.substring(0, 30)}..."`);
  
  // محاولة الـ selectors العادية أولاً
  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    console.log(`🔎 محاولة ${i + 1}/${selectors.length}: ${selector}`);
    
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) { // التأكد من أن العنصر مرئي
      console.log(`✅ تم العثور على العنصر المرئي: ${selector}`);
      console.log(`📝 نوع العنصر: ${element.tagName}, placeholder: "${element.placeholder}"`);
      
      await fillFieldElement(element, value);
      console.log(`✅ تم ملء الحقل: ${selector} = ${value}`);
      return true;
    } else if (element) {
      console.log(`⚠️ العنصر موجود لكن غير مرئي: ${selector}`);
    } else {
      console.log(`❌ لم يتم العثور على: ${selector}`);
    }
  }
  
  // محاولة البحث بـ XPath للحقول الشائعة
  console.log('🔄 محاولة البحث بـ XPath...');
  const xpathQueries = [
    "//input[contains(@placeholder, 'title') or contains(@placeholder, 'عنوان')]",
    "//input[contains(@placeholder, 'What are you selling')]",
    "//textarea[contains(@placeholder, 'description') or contains(@placeholder, 'وصف')]", 
    "//input[@type='number' or contains(@placeholder, 'price') or contains(@placeholder, 'سعر')]",
    "//input[contains(@placeholder, 'location') or contains(@placeholder, 'موقع')]",
    "//input[@type='text' and not(@readonly) and not(@disabled)]",
    "//textarea[not(@readonly) and not(@disabled)]"
  ];
  
  for (const xpath of xpathQueries) {
    console.log(`🔎 XPath: ${xpath}`);
    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (element && element.offsetParent !== null) {
      console.log(`✅ تم العثور على عنصر بـ XPath`);
      await fillFieldElement(element, value);
      console.log(`✅ تم ملء الحقل بـ XPath: ${value}`);
      return true;
    }
  }
  
  // إذا لم نجد أي حقل، نحاول البحث بطريقة أخرى
  console.log('🔄 محاولة البحث بطريقة بديلة...');
  const allVisibleInputs = Array.from(document.querySelectorAll('input, textarea'))
    .filter(el => el.offsetParent !== null && !el.disabled && !el.readOnly);
  
  console.log(`📋 عدد الحقول المرئية: ${allVisibleInputs.length}`);
  
  if (allVisibleInputs.length > 0) {
    console.log('🎯 محاولة استخدام أول حقل مرئي...');
    const firstInput = allVisibleInputs[0];
    console.log(`📝 استخدام: ${firstInput.tagName} - placeholder: "${firstInput.placeholder}"`);
    
    await fillFieldElement(firstInput, value);
    console.log(`✅ تم ملء الحقل البديل بنجاح`);
    return true;
  }
  
  console.warn('❌ لم يتم العثور على أي حقل مناسب:', selectors, 'للقيمة:', value);
  return false;
}

// ملء عنصر حقل محدد بطريقة متقدمة
async function fillFieldElement(element, value) {
  // التركيز على الحقل
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(200);
  
  element.focus();
  element.click();
  await sleep(100);
  
  // مسح المحتوى الحالي بطرق متعددة
  element.value = '';
  element.textContent = '';
  
  // محاولة مسح بـ Ctrl+A و Delete
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
  await sleep(50);
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  await sleep(50);
  
  // كتابة النص حرف بحرف (محاكاة الكتابة الطبيعية)
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    
    // إضافة الحرف للقيمة
    element.value += char;
    
    // إطلاق أحداث الكتابة
    element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
    element.dispatchEvent(new Event('input', { 
      bubbles: true, 
      inputType: 'insertText', 
      data: char 
    }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    
    // تأخير صغير بين الأحرف لمحاكاة الكتابة الطبيعية
    await sleep(30 + Math.random() * 20);
  }
  
  // إطلاق أحداث التغيير النهائية
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  
  await sleep(200);
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
  console.log('🔍 البحث عن زر النشر...');
  
  // قائمة محسنة من selectors
  const publishSelectors = [
    'button[type="submit"]',
    '[data-testid="marketplace-composer-publish-button"]',
    '[data-testid="marketplace-listing-submit-button"]',
    'button[aria-label*="نشر"]',
    'button[aria-label*="Publish"]',
    'button[aria-label*="Post"]',
    'div[role="button"][aria-label*="نشر"]',
    'div[role="button"][aria-label*="Publish"]'
  ];
  
  // محاولة الـ selectors العادية
  for (const selector of publishSelectors) {
    const button = document.querySelector(selector);
    if (button && !button.disabled && button.offsetParent !== null) {
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);
      button.click();
      console.log('✅ تم النقر على زر النشر:', selector);
      return true;
    }
  }
  
  // البحث بـ XPath
  const xpathQueries = [
    "//button[contains(text(), 'نشر') or contains(text(), 'Publish') or contains(text(), 'Post')]",
    "//div[@role='button' and (contains(text(), 'نشر') or contains(text(), 'Publish'))]",
    "//button[@type='submit']",
    "//button[contains(@aria-label, 'نشر') or contains(@aria-label, 'Publish')]"
  ];
  
  for (const xpath of xpathQueries) {
    const button = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (button && !button.disabled && button.offsetParent !== null) {
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);
      button.click();
      console.log('✅ تم النقر على زر النشر بـ XPath');
      return true;
    }
  }
  
  // البحث في جميع الأزرار بالنص
  const buttons = document.querySelectorAll('button, div[role="button"]');
  for (const button of buttons) {
    const text = button.textContent.trim().toLowerCase();
    const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
    
    if ((text.includes('نشر') || text.includes('publish') || text.includes('post') ||
         ariaLabel.includes('نشر') || ariaLabel.includes('publish') || ariaLabel.includes('post')) &&
        !button.disabled && button.offsetParent !== null) {
      
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);
      button.click();
      console.log('✅ تم النقر على زر النشر (بالنص):', text || ariaLabel);
      return true;
    }
  }
  
  console.warn('❌ لم يتم العثور على زر النشر');
  
  // محاولة أخيرة - البحث عن أي زر submit
  const submitButton = document.querySelector('button[type="submit"]:not([disabled])');
  if (submitButton && submitButton.offsetParent !== null) {
    submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);
    submitButton.click();
    console.log('✅ تم النقر على زر submit');
    return true;
  }
  
  return false;
}

// التحقق من نجاح النشر
async function verifyPublishSuccess() {
  console.log('🔍 التحقق من نجاح النشر...');
  
  // البحث عن علامات نجاح النشر
  const successIndicators = [
    // رسائل النجاح
    "//div[contains(text(), 'تم نشر') or contains(text(), 'Published') or contains(text(), 'posted')]",
    "//div[contains(text(), 'success') or contains(text(), 'نجح')]",
    
    // تغيير في URL
    () => window.location.href.includes('marketplace') && !window.location.href.includes('create'),
    
    // اختفاء نموذج النشر
    () => !document.querySelector('form') || document.querySelectorAll('input, textarea').length < 3,
    
    // ظهور صفحة جديدة
    () => document.querySelector('[data-testid="marketplace-listing-title"]') !== null
  ];
  
  // انتظار لمدة 10 ثواني للتحقق من النجاح
  for (let i = 0; i < 20; i++) {
    // فحص XPath indicators
    for (let j = 0; j < 2; j++) {
      const xpath = successIndicators[j];
      const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
      if (element) {
        console.log('✅ تم العثور على مؤشر نجاح النشر');
        return true;
      }
    }
    
    // فحص function indicators
    for (let j = 2; j < successIndicators.length; j++) {
      const checkFunction = successIndicators[j];
      if (typeof checkFunction === 'function' && checkFunction()) {
        console.log('✅ تم التحقق من نجاح النشر');
        return true;
      }
    }
    
    await sleep(500);
  }
  
  console.warn('❌ لم يتم التأكد من نجاح النشر');
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