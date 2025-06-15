// حل مباشر للمشكلة - بدون تعقيدات
console.log('🚀 Content script loaded - WORKING VERSION');

// متغيرات بسيطة
window.extractedListings = window.extractedListings || [];
window.isExtracting = false;

// دالة استخراج مباشرة
async function extractListingsNow() {
  console.log('🔍 بدء الاستخراج...');
  
  if (window.isExtracting) {
    return { success: false, message: 'جاري الاستخراج' };
  }
  
  window.isExtracting = true;
  window.extractedListings = [];
  
  try {
    // البحث عن الروابط
    const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
    console.log(`📊 عدد الروابط: ${links.length}`);
    
    if (links.length === 0) {
      window.isExtracting = false;
      return { success: false, message: 'لا توجد إعلانات' };
    }
    
    // استخراج بيانات بسيطة
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      const link = links[i];
      console.log(`📝 إعلان ${i + 1}...`);
      
      try {
        const listing = {
          id: Date.now() + i,
          title: 'إعلان ' + (i + 1),
          price: '',
          images: [],
          url: link.href
        };
        
        // البحث عن النصوص في العنصر الأب
        const parent = link.closest('div') || link.parentElement;
        if (parent) {
          const spans = parent.querySelectorAll('span');
          let foundTitle = false;
          
          spans.forEach(span => {
            const text = span.textContent.trim();
            
            // العنوان (أول نص طويل)
            if (!foundTitle && text.length > 10 && text.length < 100 && 
                !text.includes('ج.م') && !text.includes('جنيه')) {
              listing.title = text;
              foundTitle = true;
            }
            
            // السعر (أي نص يحتوي على أرقام ومال)
            if ((text.includes('ج.م') || text.includes('جنيه') || /^\d+/.test(text)) && 
                text.length < 50) {
              listing.price = text.replace(/[^\d]/g, '');
            }
          });
          
          // الصور
          const images = parent.querySelectorAll('img');
          images.forEach(img => {
            if (img.src && img.src.startsWith('http') && !img.src.includes('static')) {
              listing.images.push(img.src);
            }
          });
        }
        
        // إضافة الإعلان إذا كان له عنوان
        if (listing.title && listing.title !== 'إعلان ' + (i + 1)) {
          window.extractedListings.push(listing);
          console.log(`✅ تم: "${listing.title.substring(0, 30)}..."`);
        }
        
      } catch (error) {
        console.error(`❌ خطأ في إعلان ${i + 1}:`, error);
      }
    }
    
    console.log(`🎉 تم استخراج ${window.extractedListings.length} إعلان`);
    window.isExtracting = false;
    
    return {
      success: true,
      listings: window.extractedListings,
      count: window.extractedListings.length
    };
    
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    window.isExtracting = false;
    return { success: false, error: error.message };
  }
}

// استقبال الرسائل
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 رسالة:', request.action);
  
  if (request.action === 'extractListings') {
    extractListingsNow().then(result => {
      console.log('📤 النتيجة:', result);
      sendResponse(result);
    }).catch(error => {
      console.error('❌ خطأ:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

console.log('✅ Content script ready - WORKING VERSION');