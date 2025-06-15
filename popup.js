// Facebook Marketplace Auto Reposter - Popup Script

// متغيرات عامة
let currentListings = [];
let selectedListings = [];
let isReposting = false;
let repostQueue = [];
let currentLanguage = 'ar';

// النصوص متعددة اللغات
const translations = {
    ar: {
        title: 'إعادة نشر الإعلانات',
        welcome: 'مرحباً! اضغط على "فتح ماركت بليس" للبدء',
        openMarketplace: 'فتح ماركت بليس',
        extractListings: 'استخراج الإعلانات',
        extractedListings: 'الإعلانات المستخرجة',
        selectAll: 'تحديد الكل',
        deselectAll: 'إلغاء التحديد',
        delayLabel: 'الفاصل الزمني (ثانية):',
        startRepost: 'بدء إعادة النشر',
        reposting: 'جاري إعادة النشر...',
        stop: 'إيقاف',
        loading: 'جاري التحميل...',
        success: 'تم بنجاح',
        error: 'خطأ',
        noListings: 'لم يتم العثور على إعلانات',
        selectListings: 'يرجى تحديد إعلانات للنشر',
        repostComplete: 'تمت إعادة النشر بنجاح',
        version: 'الإصدار 1.0.0',
        help: 'المساعدة',
        about: 'حول'
    },
    en: {
        title: 'Auto Reposter',
        welcome: 'Welcome! Click "Open Marketplace" to start',
        openMarketplace: 'Open Marketplace',
        extractListings: 'Extract Listings',
        extractedListings: 'Extracted Listings',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        delayLabel: 'Delay (seconds):',
        startRepost: 'Start Reposting',
        reposting: 'Reposting...',
        stop: 'Stop',
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        noListings: 'No listings found',
        selectListings: 'Please select listings to repost',
        repostComplete: 'Reposting completed successfully',
        version: 'Version 1.0.0',
        help: 'Help',
        about: 'About'
    }
};

// تهيئة الصفحة
document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
    // إصلاح مشاكل العرض
    fixDisplayIssues();
    
    setupEventListeners();
    updateLanguage();
    checkCurrentTab();
    loadSettings();
}

// إصلاح مشاكل العرض
function fixDisplayIssues() {
    // تعيين حجم النافذة
    document.body.style.width = '380px';
    document.body.style.height = 'auto';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflowX = 'hidden';
    
    // إصلاح الحاوية الرئيسية
    const container = document.querySelector('.container');
    if (container) {
        container.style.width = '380px';
        container.style.maxWidth = '380px';
        container.style.minWidth = '380px';
        container.style.height = 'auto';
        container.style.margin = '0';
        container.style.padding = '0';
    }
    
    // إخفاء الأقسام غير المطلوبة في البداية
    const listingsSection = document.getElementById('listingsSection');
    const progressSection = document.getElementById('progressSection');
    
    if (listingsSection) listingsSection.style.display = 'none';
    if (progressSection) progressSection.style.display = 'none';
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // أزرار التحكم الرئيسية
    document.getElementById('openMarketplace').addEventListener('click', openMarketplace);
    document.getElementById('extractListings').addEventListener('click', extractListings);
    document.getElementById('startRepost').addEventListener('click', startReposting);
    document.getElementById('stopRepost').addEventListener('click', stopReposting);
    
    // تحديد الإعلانات
    document.getElementById('selectAll').addEventListener('click', selectAllListings);
    document.getElementById('deselectAll').addEventListener('click', deselectAllListings);
    
    // تبديل اللغة
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    
    // الإعدادات
    document.getElementById('autoScroll').addEventListener('change', saveSettings);
    document.getElementById('skipImages').addEventListener('change', saveSettings);
    document.getElementById('maxListings').addEventListener('change', saveSettings);
    document.getElementById('delayInput').addEventListener('change', saveSettings);
    
    // الروابط
    document.getElementById('helpLink').addEventListener('click', showHelp);
    document.getElementById('aboutLink').addEventListener('click', showAbout);
}

// فتح صفحة Marketplace
async function openMarketplace() {
    try {
        showLoading(true);
        updateStatus('info', 'جاري فتح صفحة ماركت بليس...');
        
        await chrome.runtime.sendMessage({ action: 'openMarketplace' });
        
        // تفعيل زر استخراج الإعلانات
        document.getElementById('extractListings').disabled = false;
        updateStatus('success', 'تم فتح صفحة ماركت بليس بنجاح');
        
    } catch (error) {
        console.error('Error opening marketplace:', error);
        updateStatus('error', 'خطأ في فتح صفحة ماركت بليس');
    } finally {
        showLoading(false);
    }
}

// استخراج الإعلانات
async function extractListings() {
    try {
        showLoading(true);
        updateStatus('info', 'جاري استخراج الإعلانات...');
        
        // الحصول على التبويب النشط
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('facebook.com/marketplace')) {
            updateStatus('error', 'يرجى فتح صفحة ماركت بليس أولاً');
            return;
        }
        
        // إرسال رسالة لاستخراج الإعلانات
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractListings' });
        
        if (response.success) {
            currentListings = response.listings || [];
            displayListings(currentListings);
            updateStatus('success', `تم استخراج ${currentListings.length} إعلان`);
        } else {
            updateStatus('error', response.error || 'فشل في استخراج الإعلانات');
        }
        
    } catch (error) {
        console.error('Error extracting listings:', error);
        updateStatus('error', 'خطأ في استخراج الإعلانات');
    } finally {
        showLoading(false);
    }
}

// عرض الإعلانات
function displayListings(listings) {
    const container = document.getElementById('listingsContainer');
    const section = document.getElementById('listingsSection');
    const countElement = document.getElementById('listingsCount');
    
    if (!listings || listings.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    // تحديث العداد
    countElement.textContent = listings.length;
    
    // مسح المحتوى السابق
    container.innerHTML = '';
    
    // إنشاء عناصر الإعلانات
    listings.forEach((listing, index) => {
        const listingElement = createListingElement(listing, index);
        container.appendChild(listingElement);
    });
    
    // إظهار القسم
    section.style.display = 'block';
    section.classList.add('fade-in');
    section.classList.add('show');
    
    // تفعيل زر إعادة النشر
    updateRepostButton();
}

// إنشاء عنصر إعلان
function createListingElement(listing, index) {
    const div = document.createElement('div');
    div.className = 'listing-item';
    div.dataset.index = index;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'listing-checkbox';
    checkbox.checked = true;
    checkbox.addEventListener('change', onListingSelectionChange);
    
    const image = document.createElement('img');
    image.className = 'listing-image';
    image.src = listing.images[0] || 'icons/icon32.png';
    image.alt = listing.title;
    image.onerror = () => { image.src = 'icons/icon32.png'; };
    
    const info = document.createElement('div');
    info.className = 'listing-info';
    
    const title = document.createElement('div');
    title.className = 'listing-title';
    title.textContent = listing.title || 'بدون عنوان';
    title.title = listing.title;
    
    const details = document.createElement('div');
    details.className = 'listing-details';
    
    const price = document.createElement('span');
    price.className = 'listing-price';
    price.textContent = listing.price || 'السعر غير محدد';
    
    const location = document.createElement('span');
    location.textContent = listing.location || 'الموقع غير محدد';
    
    details.appendChild(price);
    if (listing.location) {
        details.appendChild(document.createTextNode(' • '));
        details.appendChild(location);
    }
    
    info.appendChild(title);
    info.appendChild(details);
    
    div.appendChild(checkbox);
    div.appendChild(image);
    div.appendChild(info);
    
    return div;
}

// تغيير تحديد الإعلان
function onListingSelectionChange(event) {
    const listingItem = event.target.closest('.listing-item');
    const index = parseInt(listingItem.dataset.index);
    
    if (event.target.checked) {
        listingItem.classList.add('selected');
        if (!selectedListings.includes(index)) {
            selectedListings.push(index);
        }
    } else {
        listingItem.classList.remove('selected');
        selectedListings = selectedListings.filter(i => i !== index);
    }
    
    updateRepostButton();
}

// تحديد جميع الإعلانات
function selectAllListings() {
    const checkboxes = document.querySelectorAll('.listing-checkbox');
    selectedListings = [];
    
    checkboxes.forEach((checkbox, index) => {
        checkbox.checked = true;
        checkbox.closest('.listing-item').classList.add('selected');
        selectedListings.push(index);
    });
    
    updateRepostButton();
}

// إلغاء تحديد جميع الإعلانات
function deselectAllListings() {
    const checkboxes = document.querySelectorAll('.listing-checkbox');
    selectedListings = [];
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('.listing-item').classList.remove('selected');
    });
    
    updateRepostButton();
}

// تحديث زر إعادة النشر
function updateRepostButton() {
    const button = document.getElementById('startRepost');
    const selectedCount = document.querySelectorAll('.listing-checkbox:checked').length;
    
    button.disabled = selectedCount === 0 || isReposting;
    
    if (selectedCount > 0) {
        button.innerHTML = `<span class="btn-icon">🚀</span> بدء إعادة النشر (${selectedCount})`;
    } else {
        button.innerHTML = '<span class="btn-icon">🚀</span> بدء إعادة النشر';
    }
}

// بدء إعادة النشر
async function startReposting() {
    try {
        const selectedCheckboxes = document.querySelectorAll('.listing-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            updateStatus('warning', 'يرجى تحديد إعلانات للنشر');
            return;
        }
        
        isReposting = true;
        repostQueue = [];
        
        // إنشاء قائمة الإعلانات المحددة
        selectedCheckboxes.forEach(checkbox => {
            const index = parseInt(checkbox.closest('.listing-item').dataset.index);
            repostQueue.push(currentListings[index]);
        });
        
        // إظهار قسم التقدم
        showProgressSection(true);
        updateProgress(0, repostQueue.length);
        
        // بدء عملية إعادة النشر
        const delay = parseInt(document.getElementById('delayInput').value) * 1000;
        const skipImages = document.getElementById('skipImages').checked;
        
        for (let i = 0; i < repostQueue.length && isReposting; i++) {
            const listing = repostQueue[i];
            
            try {
                addLogEntry('info', `بدء إعادة نشر: ${listing.title}`);
                
                // إعداد الإعلان
                const listingData = { ...listing };
                if (skipImages) {
                    listingData.images = [];
                }
                
                // إعادة النشر
                const result = await chrome.runtime.sendMessage({
                    action: 'repostListing',
                    listing: listingData,
                    delay: delay
                });
                
                if (result.success) {
                    addLogEntry('success', `تم نشر: ${listing.title}`);
                } else {
                    addLogEntry('error', `فشل نشر: ${listing.title} - ${result.error}`);
                }
                
                updateProgress(i + 1, repostQueue.length);
                
                // انتظار الفاصل الزمني
                if (i < repostQueue.length - 1 && isReposting) {
                    addLogEntry('info', `انتظار ${delay / 1000} ثانية...`);
                    await sleep(delay);
                }
                
            } catch (error) {
                console.error('Error reposting listing:', error);
                addLogEntry('error', `خطأ في نشر: ${listing.title}`);
            }
        }
        
        if (isReposting) {
            addLogEntry('success', 'تمت إعادة النشر بنجاح!');
            updateStatus('success', 'تمت إعادة النشر بنجاح');
        }
        
    } catch (error) {
        console.error('Error in reposting process:', error);
        addLogEntry('error', 'خطأ في عملية إعادة النشر');
        updateStatus('error', 'خطأ في عملية إعادة النشر');
    } finally {
        isReposting = false;
        updateRepostButton();
    }
}

// إيقاف إعادة النشر
function stopReposting() {
    isReposting = false;
    addLogEntry('info', 'تم إيقاف عملية إعادة النشر');
    updateStatus('info', 'تم إيقاف عملية إعادة النشر');
    updateRepostButton();
}

// إظهار قسم التقدم
function showProgressSection(show) {
    const section = document.getElementById('progressSection');
    section.style.display = show ? 'block' : 'none';
    
    if (show) {
        section.classList.add('fade-in');
        section.classList.add('show');
        // مسح السجل السابق
        document.getElementById('progressLog').innerHTML = '';
    } else {
        section.classList.remove('show');
    }
}

// تحديث شريط التقدم
function updateProgress(current, total) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = `${current} من ${total}`;
    document.getElementById('progressPercent').textContent = percent + '%';
}

// إضافة مدخل إلى السجل
function addLogEntry(type, message) {
    const log = document.getElementById('progressLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// تحديث الحالة
function updateStatus(type, message) {
    const status = document.getElementById('status');
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    status.className = `status ${type}`;
    status.innerHTML = `
        <div class="status-icon">${icons[type] || 'ℹ️'}</div>
        <div class="status-text">${message}</div>
    `;
}

// إظهار/إخفاء شاشة التحميل
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// تبديل اللغة
function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    updateLanguage();
    saveSettings();
}

// تحديث اللغة
function updateLanguage() {
    const t = translations[currentLanguage];
    document.body.className = currentLanguage === 'en' ? 'en' : '';
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    // تحديث النصوص
    document.querySelector('.logo h1').textContent = t.title;
    document.getElementById('langToggle').textContent = currentLanguage === 'ar' ? 'EN' : 'ع';
    document.getElementById('openMarketplace').innerHTML = `<span class="btn-icon">🏪</span> ${t.openMarketplace}`;
    document.getElementById('extractListings').innerHTML = `<span class="btn-icon">📋</span> ${t.extractListings}`;
    
    // تحديث المزيد من النصوص حسب الحاجة
}

// فحص التبويب الحالي
async function checkCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab.url.includes('facebook.com/marketplace')) {
            document.getElementById('extractListings').disabled = false;
            updateStatus('info', 'يمكنك الآن استخراج الإعلانات');
        }
    } catch (error) {
        console.error('Error checking current tab:', error);
    }
}

// حفظ الإعدادات
function saveSettings() {
    const settings = {
        language: currentLanguage,
        autoScroll: document.getElementById('autoScroll').checked,
        skipImages: document.getElementById('skipImages').checked,
        maxListings: parseInt(document.getElementById('maxListings').value),
        delay: parseInt(document.getElementById('delayInput').value)
    };
    
    chrome.storage.local.set({ settings });
}

// تحميل الإعدادات
async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(['settings']);
        const settings = result.settings || {};
        
        currentLanguage = settings.language || 'ar';
        document.getElementById('autoScroll').checked = settings.autoScroll !== false;
        document.getElementById('skipImages').checked = settings.skipImages || false;
        document.getElementById('maxListings').value = settings.maxListings || 20;
        document.getElementById('delayInput').value = settings.delay || 10;
        
        updateLanguage();
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// عرض المساعدة
function showHelp() {
    const helpText = `
كيفية استخدام الإضافة:

1. سجل دخولك إلى Facebook
2. اضغط على "فتح ماركت بليس"
3. اضغط على "استخراج الإعلانات"
4. حدد الإعلانات التي تريد إعادة نشرها
5. اضبط الفاصل الزمني
6. اضغط على "بدء إعادة النشر"

نصائح:
- استخدم فاصل زمني لا يقل عن 10 ثوان
- لا تعيد نشر أكثر من 10 إعلانات في المرة الواحدة
- تأكد من اتصالك بالإنترنت
    `;
    
    alert(helpText);
}

// عرض معلومات الإضافة
function showAbout() {
    const aboutText = `
Facebook Marketplace Auto Reposter
الإصدار 1.0.0

إضافة لإعادة نشر إعلانات فيسبوك ماركت بليس تلقائياً

الميزات:
✓ استخراج الإعلانات تلقائياً
✓ دعم اللغة العربية والإنجليزية
✓ رفع الصور
✓ فاصل زمني قابل للتخصيص
✓ واجهة سهلة الاستخدام

تطوير: OpenHands AI
    `;
    
    alert(aboutText);
}

// دالة النوم
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}