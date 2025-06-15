// الحل النهائي - مع scroll وانتظار
console.log('🚀 Final content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListings') {
    console.log('📥 بدء الاستخراج مع scroll...');
    
    extractWithScroll().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    
    return true;
  }
});

async function extractWithScroll() {
  // عمل scroll للأسفل علشان الإعلانات تتحمل
  console.log('📜 عمل scroll للأسفل...');
  
  for (let i = 0; i < 3; i++) {
    window.scrollBy(0, 1000);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`📜 Scroll ${i + 1}/3`);
  }
  
  // انتظار إضافي للتحميل
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('⏳ انتهاء الانتظار، بدء الاستخراج...');
  
  // البحث عن كل الإعلانات
  const allElements = document.querySelectorAll('*');
  const listings = [];
  const seenUrls = new Set();
  
  console.log(`🔍 فحص ${allElements.length} عنصر...`);
  
  for (const element of allElements) {
    try {
      // البحث عن الروابط في كل عنصر
      const links = element.querySelectorAll('a');
      
      for (const link of links) {
        if (!link.href) continue;
        
        // فحص إذا كان رابط marketplace
        if (link.href.includes('marketplace') && link.href.includes('item')) {
          
          if (seenUrls.has(link.href)) continue;
          seenUrls.add(link.href);
          
          const listing = {
            id: listings.length + 1,
            title: 'إعلان ' + (listings.length + 1),
            price: 'غير محدد',
            url: link.href,
            images: []
          };
          
          // استخراج العنوان
          const linkText = link.textContent.trim();
          if (linkText && linkText.length > 3 && linkText.length < 200) {
            listing.title = linkText;
          }
          
          // البحث في العنصر الأب
          let parent = link.closest('div');
          let searchDepth = 0;
          
          while (parent && searchDepth < 5) {
            const text = parent.textContent;
            
            // البحث عن السعر
            const priceMatch = text.match(/ج\.م\.?\s*([\d,]+)|مجاني|Free/);
            if (priceMatch) {
              listing.price = priceMatch[0];
            }
            
            // البحث عن عنوان أفضل
            const spans = parent.querySelectorAll('span');
            for (const span of spans) {
              const spanText = span.textContent.trim();
              if (spanText.length > 10 && spanText.length < 100 && 
                  !spanText.includes('ج.م') && !spanText.includes('منذ')) {
                listing.title = spanText;
                break;
              }
            }
            
            // البحث عن الصور
            const images = parent.querySelectorAll('img');
            images.forEach(img => {
              if (img.src && img.src.startsWith('http')) {
                listing.images.push(img.src);
              }
            });
            
            parent = parent.parentElement;
            searchDepth++;
          }
          
          listings.push(listing);
          console.log(`✅ إعلان ${listings.length}: ${listing.title} - ${listing.price}`);
          
          if (listings.length >= 10) break;
        }
      }
      
      if (listings.length >= 10) break;
      
    } catch (error) {
      // تجاهل الأخطاء واستمر
    }
  }
  
  console.log(`🎉 تم استخراج ${listings.length} إعلان نهائياً`);
  
  return {
    success: true,
    listings: listings,
    count: listings.length
  };
}