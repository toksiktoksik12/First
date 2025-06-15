// حل بسيط جداً - يشتغل 100%
console.log('🚀 Simple content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListings') {
    console.log('📥 استلام طلب استخراج');
    
    // البحث البسيط
    const links = document.querySelectorAll('a[href*="/marketplace/item/"]');
    console.log(`🔍 عدد الروابط: ${links.length}`);
    
    const listings = [];
    const seenUrls = new Set(); // منع التكرار
    
    for (let i = 0; i < links.length && listings.length < 10; i++) {
      const link = links[i];
      
      // تجنب التكرار
      if (seenUrls.has(link.href)) {
        console.log(`⚠️ تجاهل رابط مكرر: ${link.href}`);
        continue;
      }
      seenUrls.add(link.href);
      
      // استخراج بسيط جداً
      const listing = {
        id: listings.length + 1,
        title: `إعلان ${listings.length + 1}`,
        price: 'غير محدد',
        url: link.href,
        images: []
      };
      
      // محاولة الحصول على نص من الرابط
      const linkText = link.textContent.trim();
      if (linkText && linkText.length > 3) {
        listing.title = linkText.substring(0, 80);
      }
      
      // البحث في العنصر الأب الكبير
      let parent = link.closest('div[role="article"]') || 
                   link.closest('div[data-pagelet]') || 
                   link.closest('div');
      
      if (parent) {
        // البحث عن السعر
        const priceText = parent.textContent;
        const priceMatch = priceText.match(/ج\.م\.?\s*([\d,]+)/);
        if (priceMatch) {
          listing.price = priceMatch[1];
        }
        
        // البحث عن الصور
        const images = parent.querySelectorAll('img');
        images.forEach(img => {
          if (img.src && img.src.startsWith('http') && !img.src.includes('static')) {
            listing.images.push(img.src);
          }
        });
        
        // محاولة الحصول على عنوان أفضل
        const spans = parent.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          if (text.length > 10 && text.length < 100 && 
              !text.includes('ج.م') && !text.includes('منذ') && 
              !text.includes('ago') && !text.includes('·')) {
            listing.title = text;
            break;
          }
        }
      }
      
      listings.push(listing);
      console.log(`✅ إعلان ${listings.length}: ${listing.title} - ${listing.price}`);
    }
    
    console.log(`🎉 تم استخراج ${listings.length} إعلان`);
    sendResponse({ success: true, listings: listings, count: listings.length });
  }
  
  return true;
});