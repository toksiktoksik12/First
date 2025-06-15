// حل المشكلة - يجيب كل الإعلانات مش بس المجانية
console.log('🚀 Fixed content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListings') {
    console.log('📥 بدء الاستخراج...');
    
    // البحث عن كل الإعلانات بطريقة مختلفة
    // بدل ما ندور على الروابط، هندور على الصور الأول
    const images = document.querySelectorAll('img[src*="scontent"]');
    console.log(`🖼️ عدد الصور: ${images.length}`);
    
    const listings = [];
    const seenUrls = new Set();
    
    images.forEach((img, index) => {
      // البحث عن الرابط في العنصر الأب
      let parent = img.closest('a') || img.parentElement;
      let searchDepth = 0;
      
      while (parent && searchDepth < 5) {
        // البحث عن رابط marketplace
        const link = parent.querySelector('a[href*="marketplace"]') || 
                     (parent.tagName === 'A' && parent.href && parent.href.includes('marketplace') ? parent : null);
        
        if (link && link.href && !seenUrls.has(link.href)) {
          seenUrls.add(link.href);
          
          const listing = {
            id: listings.length + 1,
            title: '',
            price: '',
            url: link.href,
            images: []
          };
          
          // استخراج العنوان من أي مكان في العنصر الأب
          const textElements = parent.querySelectorAll('span, div, h1, h2, h3, h4, p');
          for (const element of textElements) {
            const text = element.textContent.trim();
            if (text.length > 10 && text.length < 200 && 
                !text.includes('ج.م') && !text.includes('منذ') && 
                !text.includes('ago') && !text.includes('·') &&
                !text.match(/^\d+$/)) {
              listing.title = text;
              break;
            }
          }
          
          // استخراج السعر
          const fullText = parent.textContent;
          const priceMatch = fullText.match(/([\d,]+)\s*ج\.م|ج\.م\.?\s*([\d,]+)|([\d,]+)\s*جنيه|مجاني|Free/);
          if (priceMatch) {
            listing.price = priceMatch[1] || priceMatch[2] || priceMatch[3] || priceMatch[0];
          }
          
          // إضافة الصورة
          if (img.src) {
            listing.images.push(img.src);
          }
          
          // البحث عن صور إضافية
          const moreImages = parent.querySelectorAll('img');
          moreImages.forEach(extraImg => {
            if (extraImg.src && extraImg.src !== img.src) {
              listing.images.push(extraImg.src);
            }
          });
          
          if (listing.title || listing.price) {
            listings.push(listing);
            console.log(`✅ إعلان ${listings.length}: ${listing.title || 'بدون عنوان'} - ${listing.price || 'بدون سعر'}`);
          }
          
          break;
        }
        
        parent = parent.parentElement;
        searchDepth++;
      }
      
      if (listings.length >= 15) return;
    });
    
    console.log(`🎉 تم استخراج ${listings.length} إعلان`);
    sendResponse({ success: true, listings: listings, count: listings.length });
  }
  
  return true;
});