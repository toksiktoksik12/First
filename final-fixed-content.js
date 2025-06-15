// الحل النهائي - إصلاح مشكلة العناوين
console.log('🚀 Final Fixed content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListings') {
    console.log('📥 بدء الاستخراج...');
    
    // البحث عن الروابط
    const links = document.querySelectorAll('[role="main"] a[href*="/marketplace/item/"]');
    console.log(`🔍 عدد الروابط: ${links.length}`);
    
    const listings = [];
    const seenUrls = new Set();
    
    for (let i = 0; i < Math.min(links.length, 15); i++) {
      const link = links[i];
      
      if (seenUrls.has(link.href)) continue;
      seenUrls.add(link.href);
      
      const listing = {
        id: listings.length + 1,
        title: '',
        price: '',
        url: link.href,
        images: []
      };
      
      // البحث عن العنوان بطريقة مختلفة
      let parent = link.closest('div');
      let searchDepth = 0;
      
      while (parent && searchDepth < 8) {
        // جمع كل النصوص في العنصر الأب
        const allSpans = parent.querySelectorAll('span');
        const allTexts = [];
        
        allSpans.forEach(span => {
          const text = span.textContent.trim();
          if (text && text.length > 5 && text.length < 200) {
            allTexts.push(text);
          }
        });
        
        console.log(`📝 إعلان ${i + 1} - النصوص الموجودة:`, allTexts);
        
        // البحث عن العنوان (أطول نص مش سعر)
        for (const text of allTexts) {
          if (!text.includes('ج.م') && 
              !text.includes('منذ') && 
              !text.includes('ago') && 
              !text.includes('Cairo') &&
              !text.includes('Egypt') &&
              !text.match(/^\d+$/) &&
              text.length > 10) {
            listing.title = text;
            console.log(`✅ عنوان: "${text}"`);
            break;
          }
        }
        
        // البحث عن السعر
        const fullText = parent.textContent;
        const priceMatch = fullText.match(/([\d,]+)\s*ج\.م|ج\.م\.?\s*([\d,]+)|مجاني|Free/);
        if (priceMatch && !listing.price) {
          listing.price = priceMatch[1] || priceMatch[2] || priceMatch[0];
          console.log(`💰 سعر: "${listing.price}"`);
        }
        
        // البحث عن الصور
        const images = parent.querySelectorAll('img');
        images.forEach(img => {
          if (img.src && img.src.startsWith('http') && !listing.images.includes(img.src)) {
            listing.images.push(img.src);
          }
        });
        
        parent = parent.parentElement;
        searchDepth++;
      }
      
      // إذا مش لاقي عنوان، استخدم نص الرابط
      if (!listing.title) {
        const linkText = link.textContent.trim();
        if (linkText && linkText.length > 3) {
          listing.title = linkText;
          console.log(`🔗 عنوان من الرابط: "${linkText}"`);
        }
      }
      
      // إذا لسه مش لاقي عنوان، استخدم أي نص طويل
      if (!listing.title) {
        const parent = link.closest('div');
        if (parent) {
          const allText = parent.textContent;
          const sentences = allText.split(/[.،؛]/).filter(s => s.trim().length > 15 && s.trim().length < 100);
          if (sentences.length > 0) {
            listing.title = sentences[0].trim();
            console.log(`📄 عنوان من النص: "${listing.title}"`);
          }
        }
      }
      
      // إذا لسه مش لاقي عنوان، استخدم عنوان افتراضي
      if (!listing.title) {
        listing.title = `عقار للبيع ${listings.length + 1}`;
        console.log(`🏠 عنوان افتراضي: "${listing.title}"`);
      }
      
      listings.push(listing);
      console.log(`✅ إعلان ${listings.length}: "${listing.title}" - ${listing.price || 'غير محدد'} - ${listing.images.length} صور`);
    }
    
    console.log(`🎉 تم استخراج ${listings.length} إعلان نهائياً`);
    sendResponse({ success: true, listings: listings, count: listings.length });
  }
  
  return true;
});