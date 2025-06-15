// حل بسيط جداً - يشتغل 100%
console.log('🚀 Simple content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListings') {
    console.log('📥 استلام طلب استخراج');
    
    // البحث الموسع - كل أنواع الإعلانات
    const selectors = [
      'a[href*="/marketplace/item/"]',
      'a[href*="marketplace"][href*="item"]',
      'a[role="link"][href*="facebook.com"]',
      'div[role="article"] a',
      '[data-pagelet*="marketplace"] a',
      '[data-pagelet*="MarketplaceSearchResults"] a'
    ];
    
    let allLinks = [];
    selectors.forEach(selector => {
      const found = document.querySelectorAll(selector);
      console.log(`🔍 ${selector}: ${found.length} روابط`);
      allLinks.push(...found);
    });
    
    // فلترة الروابط للإعلانات فقط
    const links = Array.from(allLinks).filter(link => 
      link.href && (
        link.href.includes('/marketplace/item/') ||
        link.href.includes('marketplace') ||
        link.closest('[data-pagelet*="marketplace"]') ||
        link.closest('div[role="article"]')
      )
    );
    
    console.log(`🎯 إجمالي الروابط المفلترة: ${links.length}`);
    
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
        // البحث عن السعر بطرق متعددة
        const priceText = parent.textContent;
        
        // البحث عن أسعار مختلفة
        const pricePatterns = [
          /ج\.م\.?\s*([\d,]+)/,           // ج.م. 1,000
          /([\d,]+)\s*ج\.م/,             // 1,000 ج.م
          /([\d,]+)\s*جنيه/,             // 1,000 جنيه
          /EGP\s*([\d,]+)/,              // EGP 1,000
          /([\d,]+)\s*EGP/,              // 1,000 EGP
          /\$\s*([\d,]+)/,               // $ 1,000
          /([\d,]+)\s*\$/                // 1,000 $
        ];
        
        for (const pattern of pricePatterns) {
          const match = priceText.match(pattern);
          if (match) {
            listing.price = match[1];
            break;
          }
        }
        
        // إذا مش لاقي سعر، شوف لو مكتوب مجاني
        if (listing.price === 'غير محدد') {
          if (priceText.includes('مجاني') || priceText.includes('Free') || priceText.includes('مجانا')) {
            listing.price = 'مجاني';
          }
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
      console.log(`✅ إعلان ${listings.length}:`);
      console.log(`   العنوان: ${listing.title}`);
      console.log(`   السعر: ${listing.price}`);
      console.log(`   الصور: ${listing.images.length}`);
      console.log(`   الرابط: ${listing.url.substring(0, 50)}...`);
    }
    
    console.log(`🎉 تم استخراج ${listings.length} إعلان`);
    sendResponse({ success: true, listings: listings, count: listings.length });
  }
  
  return true;
});