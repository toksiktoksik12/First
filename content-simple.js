// إصدار مبسط جداً لاستخراج الإعلانات
console.log('🚀 تم تحميل content script المبسط');

// متغيرات بسيطة
let extractedListings = [];
let isExtracting = false;

// دالة انتظار بسيطة
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// استخراج الإعلانات بأبسط طريقة
async function extractListingsSimple() {
  console.log('🔍 بدء استخراج الإعلانات...');
  
  if (isExtracting) {
    console.log('⚠️ الاستخراج جاري بالفعل');
    return { success: false, message: 'الاستخراج جاري بالفعل' };
  }
  
  isExtracting = true;
  extractedListings = [];
  
  try {
    // انتظار قصير لتحميل الصفحة
    await sleep(2000);
    
    console.log('📄 URL الحالي:', window.location.href);
    console.log('📝 عنوان الصفحة:', document.title);
    
    // البحث عن أي روابط تحتوي على marketplace/item
    console.log('🔍 البحث عن روابط الإعلانات...');
    const allLinks = document.querySelectorAll('a');
    console.log(`🔗 إجمالي الروابط في الصفحة: ${allLinks.length}`);
    
    const marketplaceLinks = [];
    allLinks.forEach((link, index) => {
      if (link.href && link.href.includes('/marketplace/item/')) {
        marketplaceLinks.push(link);
        console.log(`✅ رابط ${marketplaceLinks.length}: ${link.href}`);
      }
    });
    
    console.log(`📊 عدد روابط الإعلانات: ${marketplaceLinks.length}`);
    
    if (marketplaceLinks.length === 0) {
      console.log('❌ لم يتم العثور على أي روابط إعلانات');
      
      // محاولة البحث عن أي عناصر تحتوي على نص يشبه الأسعار
      const allElements = document.querySelectorAll('*');
      let priceElements = 0;
      allElements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('جنيه') || text.includes('EGP') || text.includes('ج.م')) {
          priceElements++;
        }
      });
      console.log(`💰 عناصر تحتوي على أسعار: ${priceElements}`);
      
      isExtracting = false;
      return { success: false, message: 'لم يتم العثور على إعلانات - تأكد من أنك في صفحة Marketplace' };
    }
    
    // استخراج بيانات بسيطة من كل رابط
    for (let i = 0; i < Math.min(marketplaceLinks.length, 10); i++) {
      const link = marketplaceLinks[i];
      console.log(`📝 استخراج إعلان ${i + 1}...`);
      
      try {
        const listing = extractSimpleData(link);
        if (listing && listing.title) {
          extractedListings.push(listing);
          console.log(`✅ تم استخراج: "${listing.title}"`);
        }
      } catch (error) {
        console.error(`❌ خطأ في إعلان ${i + 1}:`, error);
      }
    }
    
    console.log(`🎉 تم استخراج ${extractedListings.length} إعلان بنجاح`);
    isExtracting = false;
    
    return {
      success: true,
      listings: extractedListings,
      count: extractedListings.length
    };
    
  } catch (error) {
    console.error('❌ خطأ في الاستخراج:', error);
    isExtracting = false;
    return { success: false, error: error.message };
  }
}

// استخراج بيانات بسيطة من عنصر واحد
function extractSimpleData(linkElement) {
  const listing = {
    id: Date.now() + Math.random(),
    title: 'إعلان',
    description: '',
    price: '',
    location: '',
    images: [],
    url: linkElement.href
  };
  
  // البحث عن العنوان في العنصر الأب
  const parent = linkElement.closest('div') || linkElement.parentElement;
  if (parent) {
    // البحث عن أي نص يبدو كعنوان
    const spans = parent.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent.trim();
      if (text && text.length > 5 && text.length < 100 && 
          !text.includes('جنيه') && !text.includes('EGP')) {
        listing.title = text;
        break;
      }
    }
    
    // البحث عن السعر
    for (const span of spans) {
      const text = span.textContent.trim();
      if (text.includes('جنيه') || text.includes('EGP') || text.includes('ج.م')) {
        listing.price = text.replace(/[^\d]/g, '');
        break;
      }
    }
    
    // البحث عن الصور
    const images = parent.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && img.src.startsWith('http') && !img.src.includes('static')) {
        listing.images.push(img.src);
      }
    });
  }
  
  return listing;
}

// استقبال الرسائل
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 تم استقبال رسالة:', request.action);
  
  if (request.action === 'extractListings') {
    extractListingsSimple().then(result => {
      console.log('📤 إرسال النتيجة:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('❌ خطأ:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // للاستجابة غير المتزامنة
  }
});

console.log('✅ content script المبسط جاهز');