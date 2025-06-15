// الإصدار الأساسي البسيط - اللي كان شغال
console.log('🚀 Original content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListings') {
    console.log('📥 بدء الاستخراج...');
    
    // البحث الموسع عن كل أنواع الإعلانات
    const selectors = [
      'a[href*="/marketplace/item/"]',
      'a[href*="marketplace"]',
      'div[role="article"] a',
      '[data-pagelet*="marketplace"] a',
      'a[role="link"]'
    ];
    
    let allLinks = [];
    selectors.forEach((selector, index) => {
      const found = document.querySelectorAll(selector);
      console.log(`🔍 ${index + 1}. ${selector}: ${found.length} روابط`);
      allLinks.push(...found);
    });
    
    // فلترة الروابط وإزالة المكررات
    const uniqueLinks = [];
    const seenUrls = new Set();
    
    allLinks.forEach(link => {
      if (link.href && !seenUrls.has(link.href)) {
        // فحص إذا كان الرابط متعلق بـ marketplace
        if (link.href.includes('marketplace') || 
            link.closest('[data-pagelet*="marketplace"]') ||
            link.closest('div[role="article"]')) {
          seenUrls.add(link.href);
          uniqueLinks.push(link);
        }
      }
    });
    
    const links = uniqueLinks;
    console.log(`🎯 إجمالي الروابط الفريدة: ${links.length}`);
    
    const listings = [];
    
    for (let i = 0; i < Math.min(links.length, 20); i++) {
      const link = links[i];
      
      const listing = {
        id: i + 1,
        title: '',
        price: '',
        url: link.href,
        images: []
      };
      
      // استخراج العنوان من النص
      const linkText = link.textContent.trim();
      if (linkText && linkText.length > 3) {
        listing.title = linkText;
      }
      
      // البحث عن السعر في العنصر الأب
      let parent = link.parentElement;
      let searchDepth = 0;
      
      while (parent && searchDepth < 5) {
        const text = parent.textContent;
        
        // البحث عن السعر بطرق متعددة
        const pricePatterns = [
          /ج\.م\.?\s*([\d,]+)/,           // ج.م. 1,000
          /([\d,]+)\s*ج\.م/,             // 1,000 ج.م
          /([\d,]+)\s*جنيه/,             // 1,000 جنيه
          /EGP\s*([\d,]+)/i,             // EGP 1,000
          /([\d,]+)\s*EGP/i,             // 1,000 EGP
          /\$\s*([\d,]+)/,               // $ 1,000
          /([\d,]+)\s*\$/,               // 1,000 $
          /([\d,]+)\s*ألف/,              // 100 ألف
          /([\d,]+)k/i                   // 100k
        ];
        
        for (const pattern of pricePatterns) {
          const match = text.match(pattern);
          if (match && !listing.price) {
            listing.price = match[1] || match[0];
            break;
          }
        }
        
        // إذا مش لاقي سعر، شوف لو مكتوب مجاني
        if (!listing.price && (text.includes('مجاني') || text.includes('Free'))) {
          listing.price = 'مجاني';
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
      
      // إضافة الإعلان إذا كان له عنوان
      if (listing.title) {
        listings.push(listing);
        console.log(`✅ إعلان ${i + 1}: ${listing.title} - ${listing.price}`);
      }
    }
    
    console.log(`🎉 تم استخراج ${listings.length} إعلان`);
    sendResponse({ success: true, listings: listings, count: listings.length });
  }
  
  return true;
});