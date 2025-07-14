document.addEventListener('DOMContentLoaded', () => {
    // المتغيرات الأساسية
    const recitersContainer = document.getElementById('reciters-container');
    const surahsContainer = document.getElementById('surahs-container');
    const audioPlayer = document.getElementById('audio-player');
    const currentReciterLabel = document.getElementById('current-reciter-label');
    const currentSurahLabel = document.getElementById('current-surah-label');
    const themeToggle = document.getElementById('theme-toggle');
    const riwayaFilter = document.getElementById('riwaya-filter');
    const reciterSearchInput = document.getElementById('reciter-search');
    const surahSearchInput = document.getElementById('surah-search');
    const saveBookmarkBtn = document.getElementById('save-bookmark-btn');
    const loadBookmarkBtn = document.getElementById('load-bookmark-btn');
    const downloadSurahBtn = document.getElementById('download-surah-btn');
    const downloadMushafBtn = document.getElementById('download-mushaf-btn');
    const recitersCount = document.getElementById('reciters-count');
    const surahsCount = document.getElementById('surahs-count');

    let allReciters = [];
    let allSurahs = [];
    let selectedReciter = null;
    let selectedSurah = null;
    let currentReciterCard = null;
    let currentSurahCard = null;

    const apiBaseUrl = 'https://www.mp3quran.net/api/v3';

    // الدوال الأساسية
    function createCard(text, type, dataId, clickHandler) {
        const card = document.createElement('div');
        card.className = `card ${type}`;
        card.textContent = text;
        card.dataset.id = dataId;
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', () => clickHandler(card));
        card.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler(card);
            }
        });
        return card;
    }

    // إزالة مؤشرات التحميل
    function removeLoadingSpinner(container) {
        const spinner = container.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    // تحميل وعرض القراء
    async function loadReciters() {
        try {
            console.log('بدء تحميل القراء...');
            const response = await axios.get(`${apiBaseUrl}/reciters?language=ar`);
            
            if (response.data && response.data.reciters) {
                allReciters = response.data.reciters.filter(reciter => {
                    return reciter && reciter.moshaf && 
                           reciter.moshaf.some(m => m && m.server && m.surah_total === 114);
                });
                
                console.log(`تم تحميل ${allReciters.length} قارئ`);
                removeLoadingSpinner(recitersContainer);
                displayReciters();
                updateRecitersCount(allReciters.length);
                setupRiwayaFilter();
            }
        } catch (error) {
            console.error('خطأ في تحميل القراء:', error);
            removeLoadingSpinner(recitersContainer);
            recitersContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--error-color);"><i class="fas fa-exclamation-triangle"></i><p>فشل تحميل القراء</p></div>';
        }
    }

    // تحميل وعرض السور
    async function loadSurahs() {
        try {
            console.log('بدء تحميل السور...');
            const response = await axios.get(`${apiBaseUrl}/suwar?language=ar`);
            
            if (response.data && response.data.suwar) {
                allSurahs = response.data.suwar;
                console.log(`تم تحميل ${allSurahs.length} سورة`);
                removeLoadingSpinner(surahsContainer);
                displaySurahs();
            }
        } catch (error) {
            console.error('خطأ في تحميل السور:', error);
            removeLoadingSpinner(surahsContainer);
            surahsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--error-color);"><i class="fas fa-exclamation-triangle"></i><p>فشل تحميل السور</p></div>';
        }
    }

    // تحديث عداد القراء
    function updateRecitersCount(count) {
        if (recitersCount) {
            recitersCount.textContent = count;
        }
    }

    // عرض القراء
    function displayReciters() {
        recitersContainer.innerHTML = '';
        allReciters.forEach(reciter => {
            const card = createCard(reciter.name, 'reciter', reciter.id, (clickedCard) => {
                selectReciter(reciter, clickedCard);
            });
            recitersContainer.appendChild(card);
        });
        updateRecitersCount(allReciters.length);
    }

    // عرض السور
    function displaySurahs() {
        surahsContainer.innerHTML = '';
        allSurahs.forEach(surah => {
            const card = createCard(surah.name, 'surah', surah.id, (clickedCard) => {
                selectSurah(surah, clickedCard);
            });
            surahsContainer.appendChild(card);
        });
    }

    // دالة مساعدة لتوحيد أسماء الروايات
    function normalizeRiwayaName(name) {
        const normalized = name.trim();
        
        if (normalized.includes('حفص') || normalized.toLowerCase().includes('hafs')) {
            return 'حفص عن عاصم';
        }
        if (normalized.includes('ورش') || normalized.toLowerCase().includes('warsh')) {
            return 'ورش عن نافع';
        }
        if (normalized.includes('قالون') || normalized.toLowerCase().includes('qalon')) {
            return 'قالون عن نافع';
        }
        if (normalized.includes('شعبة') || normalized.toLowerCase().includes('shu\'bah')) {
            return 'شعبة عن عاصم';
        }
        if (normalized.includes('الدوري') && normalized.includes('أبي عمرو')) {
            return 'الدوري عن أبي عمرو';
        }
        if (normalized.includes('السوسي') && normalized.includes('أبي عمرو')) {
            return 'السوسي عن أبي عمرو';
        }
        if (normalized.includes('البزي')) {
            return 'البزي عن ابن كثير';
        }
        if (normalized.includes('قنبل')) {
            return 'قنبل عن ابن كثير';
        }
        
        return normalized;
    }

    // إعداد فلتر الروايات مع ربط دقيق بالقراء
    function setupRiwayaFilter() {
        console.log('بدء إعداد فلتر الروايات مع ربط القراء...');
        
        riwayaFilter.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'كل الروايات';
        riwayaFilter.appendChild(allOption);
        
        const riwayaRecitersMap = new Map();
        
        allReciters.forEach(reciter => {
            if (reciter && reciter.moshaf && Array.isArray(reciter.moshaf)) {
                reciter.moshaf.forEach(moshaf => {
                    if (moshaf && 
                        moshaf.riwayah_name && 
                        typeof moshaf.riwayah_name === 'string' && 
                        moshaf.riwayah_name.trim() !== '' &&
                        moshaf.server &&
                        moshaf.surah_total === 114) {
                        
                        const riwayaName = normalizeRiwayaName(moshaf.riwayah_name.trim());
                        
                        if (!riwayaRecitersMap.has(riwayaName)) {
                            riwayaRecitersMap.set(riwayaName, new Set());
                        }
                        
                        riwayaRecitersMap.get(riwayaName).add({
                            reciter: reciter,
                            moshaf: moshaf,
                            originalRiwayaName: moshaf.riwayah_name.trim()
                        });
                        
                        console.log(`ربط: "${riwayaName}" <- ${reciter.name} (${moshaf.riwayah_name})`);
                    }
                });
            }
        });
        
        window.riwayaRecitersMap = riwayaRecitersMap;
        
        console.log(`تم بناء خريطة لـ ${riwayaRecitersMap.size} رواية`);
        
        if (riwayaRecitersMap.size > 0) {
            const sortedRiwayat = Array.from(riwayaRecitersMap.keys()).sort();
            sortedRiwayat.forEach(riwaya => {
                const recitersCount = riwayaRecitersMap.get(riwaya).size;
                const option = document.createElement('option');
                option.value = riwaya;
                option.textContent = `${riwaya} (${recitersCount} قارئ)`;
                riwayaFilter.appendChild(option);
            });
            
            riwayaFilter.disabled = false;
            console.log('تم إعداد الفلتر بنجاح مع الروايات:', sortedRiwayat);
        } else {
            console.log('لم يتم العثور على روايات مرتبطة بقراء');
            riwayaFilter.disabled = true;
        }
    }

    // اختيار القارئ مع مصحف محدد للرواية المختارة
    function selectReciterWithSpecificMoshaf(reciter, specificMoshaf, card) {
        selectedReciter = {
            id: reciter.id,
            name: reciter.name,
            server: specificMoshaf.server,
            riwaya: specificMoshaf.riwayah_name
        };

        currentReciterLabel.textContent = `القارئ: ${reciter.name} (${normalizeRiwayaName(specificMoshaf.riwayah_name)})`;
        
        if (currentReciterCard) currentReciterCard.classList.remove('selected');
        card.classList.add('selected');
        currentReciterCard = card;

        playAudio();
        updateActionButtons();
        
        console.log(`تم اختيار: ${reciter.name} - ${specificMoshaf.riwayah_name}`);
    }

    // اختيار القارئ العادي
    function selectReciter(reciter, card) {
        const selectedRiwaya = riwayaFilter.value;
        let validMoshaf;

        if (selectedRiwaya !== 'all') {
            validMoshaf = reciter.moshaf.find(m => {
                if (!m.riwayah_name || !m.server || m.surah_total !== 114) return false;
                
                const moshafRiwaya = m.riwayah_name.trim();
                const normalizedMoshafRiwaya = normalizeRiwayaName(moshafRiwaya);
                
                return normalizedMoshafRiwaya === selectedRiwaya || 
                       moshafRiwaya === selectedRiwaya ||
                       moshafRiwaya.includes(selectedRiwaya.split(' ')[0]);
            });
        }

        if (!validMoshaf) {
            validMoshaf = reciter.moshaf.find(m => m.server && m.surah_total === 114);
        }
        
        selectedReciter = {
            id: reciter.id,
            name: reciter.name,
            server: validMoshaf.server
        };

        currentReciterLabel.textContent = `القارئ: ${reciter.name}`;
        
        if (currentReciterCard) currentReciterCard.classList.remove('selected');
        card.classList.add('selected');
        currentReciterCard = card;

        playAudio();
        updateActionButtons();
    }

    // اختيار السورة
    function selectSurah(surah, card) {
        selectedSurah = {
            id: String(surah.id).padStart(3, '0'),
            name: surah.name
        };

        currentSurahLabel.textContent = `السورة: ${surah.name}`;
        
        if (currentSurahCard) currentSurahCard.classList.remove('selected');
        card.classList.add('selected');
        currentSurahCard = card;

        playAudio();
        updateActionButtons();
    }

    // تشغيل الصوت
    function playAudio() {
        if (selectedReciter && selectedSurah) {
            const audioSrc = `${selectedReciter.server}/${selectedSurah.id}.mp3`;
            audioPlayer.src = audioSrc;
            audioPlayer.play().catch(e => {
                console.error("خطأ في التشغيل:", e);
                // يمكن إضافة إشعار للمستخدم هنا
            });
        }
    }

    // فلترة الروايات - عرض قراء مخصصين فقط
    function filterByRiwaya() {
        const selectedRiwaya = riwayaFilter.value;
        console.log('فلترة حسب الرواية:', selectedRiwaya);
        
        if (selectedRiwaya === 'all') {
            displayReciters();
            return;
        }

        if (!window.riwayaRecitersMap || !window.riwayaRecitersMap.has(selectedRiwaya)) {
            console.error('لم يتم العثور على بيانات للرواية:', selectedRiwaya);
            recitersContainer.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--error-color);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>عذراً، لا توجد بيانات متاحة لهذه الرواية</p>
                    <button onclick="setupRiwayaFilter(); filterByRiwaya();" style="margin-top:10px; padding:5px 10px; background:var(--primary-color); color:white; border:none; border-radius:5px; cursor:pointer;">
                        إعادة تحميل البيانات
                    </button>
                </div>
            `;
            return;
        }

        const specificRecitersData = Array.from(window.riwayaRecitersMap.get(selectedRiwaya));
        
        console.log(`عرض ${specificRecitersData.length} قارئ للرواية: ${selectedRiwaya}`);

        recitersContainer.innerHTML = '';
        
        if (specificRecitersData.length === 0) {
            recitersContainer.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--text-secondary);">
                    <i class="fas fa-info-circle"></i>
                    <p>لا يوجد قراء متاحون لرواية "${selectedRiwaya}"</p>
                    <p style="font-size:0.9em; margin-top:10px;">جرب اختيار رواية أخرى</p>
                </div>
            `;
            updateRecitersCount(0);
            return;
        }

        // إضافة معلومات إحصائية
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'text-align:center; padding:10px; background:var(--bg-tertiary); border-radius:var(--border-radius-small); margin-bottom:10px; font-size:0.9em; color:var(--primary-color); border: 1px solid var(--border-color);';
        infoDiv.innerHTML = `
            <i class="fas fa-filter"></i>
            <strong>رواية ${selectedRiwaya}</strong><br>
            ${specificRecitersData.length} قارئ متاح
        `;
        recitersContainer.appendChild(infoDiv);

        // عرض القراء المخصصين فقط
        specificRecitersData.forEach(data => {
            const { reciter, moshaf } = data;
            
            const card = createCard(reciter.name, 'reciter', reciter.id, (clickedCard) => {
                selectReciterWithSpecificMoshaf(reciter, moshaf, clickedCard);
            });
            
            card.title = `${reciter.name} - ${data.originalRiwayaName}`;
            recitersContainer.appendChild(card);
        });
        
        updateRecitersCount(specificRecitersData.length);
    }

    // التشغيل التلقائي للسورة التالية
    function handlePlaybackFinished() {
        if (!selectedReciter || !selectedSurah || allSurahs.length === 0) return;
        
        const currentSurahId = parseInt(selectedSurah.id, 10);
        if (currentSurahId < 114) {
            const nextSurah = allSurahs.find(s => s.id === currentSurahId + 1);
            if (nextSurah) {
                const nextSurahCard = surahsContainer.querySelector(`.card[data-id='${nextSurah.id}']`);
                if (nextSurahCard) {
                    selectSurah(nextSurah, nextSurahCard);
                }
            }
        } else {
            const currentIndex = allReciters.findIndex(r => r.id === selectedReciter.id);
            if (currentIndex !== -1 && allReciters.length > 0) {
                const nextIndex = (currentIndex + 1) % allReciters.length;
                const nextReciter = allReciters[nextIndex];
                const nextReciterCard = recitersContainer.querySelector(`.card[data-id='${nextReciter.id}']`);
                const firstSurah = allSurahs.find(s => s.id === 1);
                const firstSurahCard = surahsContainer.querySelector(`.card[data-id='1']`);
                
                if (nextReciterCard) selectReciter(nextReciter, nextReciterCard);
                if (firstSurahCard) selectSurah(firstSurah, firstSurahCard);
            }
        }
    }

    // البحث في القراء
    function searchReciters() {
        const searchTerm = reciterSearchInput.value.toLowerCase().trim();
        const cards = recitersContainer.querySelectorAll('.card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            if (card.classList.contains('card')) {
                const cardText = card.textContent.toLowerCase();
                const isVisible = cardText.includes(searchTerm);
                card.style.display = isVisible ? 'block' : 'none';
                if (isVisible) visibleCount++;
            }
        });
        
        updateRecitersCount(visibleCount);
    }

    // البحث في السور
    function searchSurahs() {
        const searchTerm = surahSearchInput.value.toLowerCase().trim();
        const cards = surahsContainer.querySelectorAll('.card');
        
        cards.forEach(card => {
            const cardText = card.textContent.toLowerCase();
            card.style.display = cardText.includes(searchTerm) ? 'block' : 'none';
        });
    }

    // حفظ العلامة المرجعية
    function saveBookmark() {
        if (selectedReciter && selectedSurah) {
            const bookmark = {
                reciterId: selectedReciter.id,
                surahId: parseInt(selectedSurah.id, 10)
            };
            localStorage.setItem('quranPlayerBookmark', JSON.stringify(bookmark));
            checkBookmarkStatus();
            
            // إشعار بصري بسيط
            const btn = saveBookmarkBtn;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i><span>تم الحفظ!</span>';
            btn.style.background = 'var(--success-color)';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }
    }

    // تحميل العلامة المرجعية
    function loadBookmark() {
        const bookmarkJSON = localStorage.getItem('quranPlayerBookmark');
        if (!bookmarkJSON || allReciters.length === 0 || allSurahs.length === 0) return;
        
        const bookmark = JSON.parse(bookmarkJSON);
        const reciter = allReciters.find(r => r.id === bookmark.reciterId);
        const surah = allSurahs.find(s => s.id === bookmark.surahId);

        if (reciter && surah) {
            const reciterCard = recitersContainer.querySelector(`.card[data-id='${reciter.id}']`);
            const surahCard = surahsContainer.querySelector(`.card[data-id='${surah.id}']`);
            
            if (reciterCard) selectReciter(reciter, reciterCard);
            if (surahCard) selectSurah(surah, surahCard);
            
            // إشعار بصري
            const btn = loadBookmarkBtn;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i><span>تم الاستعادة!</span>';
            btn.style.background = 'var(--success-color)';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }
    }

    // التحقق من حالة العلامة المرجعية
    function checkBookmarkStatus() {
        loadBookmarkBtn.classList.toggle('disabled', !localStorage.getItem('quranPlayerBookmark'));
    }

    // تحديث أزرار التحميل والحفظ
    function updateActionButtons() {
        const canOperate = selectedReciter && selectedSurah;
        
        saveBookmarkBtn.classList.toggle('disabled', !canOperate);
        downloadSurahBtn.classList.toggle('disabled', !canOperate);
        
        if (canOperate) {
            downloadSurahBtn.href = `${selectedReciter.server}/${selectedSurah.id}.mp3`;
            downloadSurahBtn.download = `${selectedReciter.name} - ${selectedSurah.name}.mp3`;
        }

        downloadMushafBtn.classList.toggle('disabled', !selectedReciter);
        if (selectedReciter) {
            const parts = selectedReciter.server.split('/').filter(Boolean);
            downloadMushafBtn.href = `https://mp3quran.net/ar/${parts[parts.length - 1]}`;
        }
    }

    // الوضع الداكن
    function setDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeToggle.checked = isDark;
    }

    // ربط الأحداث
    riwayaFilter.addEventListener('change', filterByRiwaya);
    reciterSearchInput.addEventListener('input', searchReciters);
    surahSearchInput.addEventListener('input', searchSurahs);
    themeToggle.addEventListener('change', () => setDarkMode(themeToggle.checked));
    saveBookmarkBtn.addEventListener('click', saveBookmark);
    loadBookmarkBtn.addEventListener('click', loadBookmark);
    audioPlayer.addEventListener('ended', handlePlaybackFinished);

    // تحميل الإعدادات المحفوظة
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setDarkMode(savedTheme === 'dark');
    }

    // بدء تشغيل التطبيق
    console.log('بدء تحميل البيانات...');
    loadReciters();
    loadSurahs();
    checkBookmarkStatus();




    ////////////////////////////////////////////////
    ////////////////////////////////////////////////




    // إضافة وظائف نموذج التواصل
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = contactForm.querySelector('.submit-btn');
    
    contactForm.addEventListener('submit', handleContactSubmit);
    
    // إضافة تحقق فوري للحقول
    const requiredFields = contactForm.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.addEventListener('input', validateField);
        field.addEventListener('blur', validateField);
    });
}

function validateField(event) {
    const field = event.target;
    const isValid = field.checkValidity();
    
    if (isValid) {
        field.style.borderColor = 'var(--success-color)';
    } else if (field.value.length > 0) {
        field.style.borderColor = 'var(--error-color)';
    } else {
        field.style.borderColor = 'var(--border-color)';
    }
}

async function handleContactSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // جمع بيانات النموذج
    const formData = {
        type: document.getElementById('report-type').value,
        title: document.getElementById('report-title').value,
        description: document.getElementById('report-description').value,
        userEmail: document.getElementById('user-email').value,
        timestamp: new Date().toLocaleString('ar-SA'),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    // التحقق من صحة البيانات
    if (!formData.type || !formData.title || !formData.description) {
        showStatusMessage('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // تعطيل النموذج أثناء الإرسال
    form.classList.add('form-sending');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
        <i class="fas fa-spinner fa-spin"></i>
        <span>جاري الإرسال...</span>
    `;
    
    try {
        // إنشاء رابط mailto
        const subject = encodeURIComponent(`[${getTypeText(formData.type)}] ${formData.title}`);
        const body = encodeURIComponent(
            `نوع التقرير: ${getTypeText(formData.type)}\n` +
            `العنوان: ${formData.title}\n\n` +
            `التفاصيل:\n${formData.description}\n\n` +
            `---\n` +
            `إيميل المرسل: ${formData.userEmail || 'غير محدد'}\n` +
            `التاريخ والوقت: ${formData.timestamp}\n` +
            `رابط الصفحة: ${formData.url}\n` +
            `معلومات المتصفح: ${formData.userAgent}`
        );
        
        const mailtoLink = `mailto:salah.eddine.program@gmail.com?subject=${subject}&body=${body}`;
        
        // فتح تطبيق البريد الإلكتروني
        window.location.href = mailtoLink;
        
        // عرض رسالة نجاح
        showStatusMessage('تم فتح تطبيق البريد الإلكتروني. يرجى إرسال الرسالة من التطبيق.', 'success');
        
        // إعادة تعيين النموذج بعد فترة
        setTimeout(() => {
            form.reset();
            clearValidationStyles();
        }, 2000);
        
    } catch (error) {
        console.error('خطأ في إرسال التقرير:', error);
        showStatusMessage('حدث خطأ. يرجى المحاولة مرة أخرى أو إرسال إيميل مباشر إلى: salah.eddine.program@gmail.com', 'error');
    } finally {
        // إعادة تفعيل النموذج
        form.classList.remove('form-sending');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function getTypeText(type) {
    const types = {
        'bug': 'إبلاغ عن خطأ',
        'improvement': 'اقتراح تحسين',
        'feature': 'طلب ميزة جديدة',
        'other': 'أخرى'
    };
    return types[type] || type;
}

function showStatusMessage(message, type) {
    // إزالة أي رسالة سابقة
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // إنشاء رسالة جديدة
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
        ${message}
    `;
    
    // إضافة الرسالة بعد النموذج
    const form = document.getElementById('contact-form');
    form.appendChild(statusDiv);
    
    // إزالة الرسالة بعد 5 ثواني
    setTimeout(() => {
        if (statusDiv.parentNode) {
            statusDiv.remove();
        }
    }, 5000);
}

function clearValidationStyles() {
    const fields = document.querySelectorAll('#contact-form input, #contact-form select, #contact-form textarea');
    fields.forEach(field => {
        field.style.borderColor = 'var(--border-color)';
    });
}

// تهيئة نموذج التواصل عند تحميل الصفحة
// أضف هذا السطر في نهاية function initializeApp() أو بعد تحميل الصفحة
initializeContactForm();

});
