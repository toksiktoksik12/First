// Script تشخيصي - يطبع كل حاجة
console.log('🔍 Debug script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractListings') {
    console.log('🔍 بدء التشخيص...');
    
    // طباعة معلومات الصفحة
    console.log('📄 URL:', window.location.href);
    console.log('📝 Title:', document.title);
    console.log('🌐 Domain:', window.location.hostname);
    
    // البحث عن كل الروابط
    const allLinks = document.querySelectorAll('a');
    console.log(`🔗 إجمالي الروابط: ${allLinks.length}`);
    
    // فلترة روابط marketplace
    const marketplaceLinks = Array.from(allLinks).filter(link => 
      link.href && link.href.includes('marketplace')
    );
    console.log(`🏪 روابط marketplace: ${marketplaceLinks.length}`);
    
    // طباعة أول 10 روابط marketplace
    marketplaceLinks.slice(0, 10).forEach((link, index) => {
      console.log(`${index + 1}. ${link.href}`);
      console.log(`   النص: "${link.textContent.trim().substring(0, 50)}"`);
    });
    
    // البحث عن الصور
    const allImages = document.querySelectorAll('img');
    console.log(`🖼️ إجمالي الصور: ${allImages.length}`);
    
    // البحث عن عناصر تحتوي على أسعار
    const priceElements = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(element => {
      const text = element.textContent;
      if (text && (text.includes('ج.م') || text.includes('جنيه') || text.includes('مجاني'))) {
        priceElements.push({
          tag: element.tagName,
          text: text.trim().substring(0, 100),
          hasMarketplaceLink: !!element.querySelector('a[href*="marketplace"]')
        });
      }
    });
    
    console.log(`💰 عناصر تحتوي على أسعار: ${priceElements.length}`);
    priceElements.slice(0, 10).forEach((element, index) => {
      console.log(`${index + 1}. ${element.tag}: "${element.text}"`);
      console.log(`   يحتوي على رابط marketplace: ${element.hasMarketplaceLink}`);
    });
    
    // البحث عن data attributes
    const dataElements = document.querySelectorAll('[data-pagelet], [data-testid], [role="article"]');
    console.log(`📊 عناصر data: ${dataElements.length}`);
    
    dataElements.slice(0, 5).forEach((element, index) => {
      console.log(`${index + 1}. ${element.tagName}:`);
      console.log(`   data-pagelet: ${element.getAttribute('data-pagelet')}`);
      console.log(`   data-testid: ${element.getAttribute('data-testid')}`);
      console.log(`   role: ${element.getAttribute('role')}`);
    });
    
    // محاولة استخراج بسيطة
    const simpleListings = [];
    marketplaceLinks.slice(0, 5).forEach((link, index) => {
      const parent = link.closest('div');
      if (parent) {
        const text = parent.textContent;
        const priceMatch = text.match(/ج\.م\.?\s*([\d,]+)|مجاني|Free/);
        
        simpleListings.push({
          id: index + 1,
          url: link.href,
          text: link.textContent.trim().substring(0, 50),
          price: priceMatch ? priceMatch[0] : 'غير محدد',
          parentText: text.substring(0, 200)
        });
      }
    });
    
    console.log('📋 محاولة استخراج بسيطة:');
    simpleListings.forEach(listing => {
      console.log(`${listing.id}. ${listing.text} - ${listing.price}`);
    });
    
    sendResponse({ 
      success: true, 
      listings: simpleListings,
      count: simpleListings.length,
      debug: {
        totalLinks: allLinks.length,
        marketplaceLinks: marketplaceLinks.length,
        totalImages: allImages.length,
        priceElements: priceElements.length,
        dataElements: dataElements.length
      }
    });
  }
  
  return true;
});