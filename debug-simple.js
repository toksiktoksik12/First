// تشخيص بسيط - نشوف إيه اللي موجود في الصفحة
console.log('🔍 DEBUG: Starting page analysis...');

function analyzePageContent() {
  console.log('📍 Current URL:', window.location.href);
  console.log('📍 Page title:', document.title);
  
  // شوف كل الروابط
  const allLinks = document.querySelectorAll('a');
  console.log(`🔗 Total links found: ${allLinks.length}`);
  
  // شوف الروابط اللي فيها marketplace
  const marketplaceLinks = document.querySelectorAll('a[href*="marketplace"]');
  console.log(`🏪 Marketplace links: ${marketplaceLinks.length}`);
  
  // شوف الروابط اللي فيها item
  const itemLinks = document.querySelectorAll('a[href*="/item/"]');
  console.log(`📦 Item links: ${itemLinks.length}`);
  
  // شوف الروابط المحددة
  const specificLinks = document.querySelectorAll('a[href*="/marketplace/item/"]');
  console.log(`🎯 Specific marketplace item links: ${specificLinks.length}`);
  
  // طبع أول 5 روابط للفحص
  console.log('📋 First 5 marketplace links:');
  for (let i = 0; i < Math.min(5, specificLinks.length); i++) {
    const link = specificLinks[i];
    console.log(`${i + 1}. ${link.href}`);
    console.log(`   Text: "${link.textContent.trim().substring(0, 50)}..."`);
    console.log(`   Parent: ${link.parentElement.tagName}`);
  }
  
  // شوف كل العناصر اللي ممكن تكون إعلانات
  const possibleAds = document.querySelectorAll('[role="main"] > div, [data-pagelet] > div, .marketplace-item, .listing');
  console.log(`📊 Possible ad containers: ${possibleAds.length}`);
  
  // شوف الصور
  const images = document.querySelectorAll('img');
  console.log(`🖼️ Total images: ${images.length}`);
  
  // شوف النصوص اللي فيها أسعار
  const priceTexts = [];
  const allSpans = document.querySelectorAll('span');
  allSpans.forEach(span => {
    const text = span.textContent.trim();
    if (text.includes('ج.م') || text.includes('جنيه') || text.includes('EGP')) {
      priceTexts.push(text);
    }
  });
  console.log(`💰 Price texts found: ${priceTexts.length}`);
  priceTexts.slice(0, 5).forEach((price, i) => {
    console.log(`${i + 1}. "${price}"`);
  });
  
  return {
    url: window.location.href,
    totalLinks: allLinks.length,
    marketplaceLinks: marketplaceLinks.length,
    itemLinks: itemLinks.length,
    specificLinks: specificLinks.length,
    possibleAds: possibleAds.length,
    images: images.length,
    priceTexts: priceTexts.length
  };
}

// تشغيل التحليل
const analysis = analyzePageContent();
console.log('📊 Analysis complete:', analysis);

// استقبال الرسائل
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    const result = analyzePageContent();
    sendResponse({ success: true, analysis: result });
  }
  
  if (request.action === 'extractListings') {
    const result = analyzePageContent();
    sendResponse({ 
      success: true, 
      listings: [], 
      message: `Found ${result.specificLinks} marketplace links`,
      analysis: result 
    });
  }
});

console.log('✅ DEBUG script ready');