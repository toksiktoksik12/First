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
          // البحث عن العنوان في الرابط نفسه أولاً
          const linkText = link.textContent.trim();
          if (linkText && linkText.length > 5 && linkText.length < 200 && 
              !linkText.includes('ج.م') && !linkText.includes('جنيه')) {
            listing.title = linkText;
          }
          
          // إذا مش لاقي عنوان، دور في العناصر المجاورة
          if (!listing.title || listing.title === 'إعلان ' + (i + 1)) {
            const allTexts = [];
            const textElements = parent.querySelectorAll('span, div, h1, h2, h3, h4, a');
            
            textElements.forEach(el => {
              const text = el.textContent.trim();
              if (text && text.length > 5 && text.length < 200) {
                allTexts.push(text);
              }
            });
            
            // أول نص مش سعر يبقى العنوان
            for (const text of allTexts) {
              if (!text.includes('ج.م') && !text.includes('جنيه') && 
                  !text.includes('EGP') && !/^[\d\s\,\.]+$/.test(text) &&
                  !text.includes('منذ') && !text.includes('ago')) {
                listing.title = text;
                break;
              }
            }
          }
          
          // البحث عن السعر
          const spans = parent.querySelectorAll('span');
          spans.forEach(span => {
            const text = span.textContent.trim();
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
        console.log(`📋 إعلان ${i + 1}: العنوان="${listing.title}", السعر="${listing.price}", الصور=${listing.images.length}`);
        
        if (listing.title && listing.title !== 'إعلان ' + (i + 1)) {
          window.extractedListings.push(listing);
          console.log(`✅ تم: "${listing.title.substring(0, 30)}..."`);
        } else {
          console.log(`❌ تم تجاهل الإعلان - عنوان فارغ أو افتراضي`);
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