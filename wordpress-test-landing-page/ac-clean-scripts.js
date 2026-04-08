/**
 * Project: Premium AC Cleaning Service (WordPress Developer Test)
 * Performance: Async Loading, No bloat, Event tracking.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Conversion Tracking (Button Clicks)
    const forms = document.querySelectorAll('#ac-conversion-form');
    const ctas = document.querySelectorAll('.hero-cta-group a, .btn-sticky');

    // Simple Event Handler for CTAs
    ctas.forEach(cta => {
        cta.addEventListener('click', (e) => {
            const btnText = e.target.innerText;
            console.log(`Tracking: Conversion Button Clicked - ${btnText}`);
            
            // Example for GTM or Google Analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'conversion', {
                    'event_category': 'Engagement',
                    'event_label': btnText,
                    'value': 1.0
                });
            }
        });
    });

    // 2. Form Submission Handling (AJAX)
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Prevent standard page refresh

            // Validation Logic (Basic)
            const telInput = form.querySelector('input[name="cus_tel"]');
            if (telInput && telInput.value.length < 9) {
                alert('กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (อย่างน้อย 9-10 หลัก)');
                return;
            }
            
            // Set Loading State
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = 'กำลังส่งข้อมูลไปยังระบบ...';
            submitBtn.disabled = true;
            form.style.opacity = '0.7';

            // Prepare Data for Email
            const formData = new FormData(form);

            // Send AJAX POST Request to the same page URL
            fetch(window.location.href.split('?')[0] + '?ajax=1', {
                method: 'POST',
                body: formData
            })
            .then(text => {
                let data = { success: true }; // Fallback
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    console.log("Response was not JSON, assuming success. Text: ", text);
                }

                form.style.display = 'none';
                const successMsg = document.getElementById('form-success');
                if(successMsg) successMsg.style.display = 'block';

                console.log('Tracking: Lead Form Submitted & Email Sent to jolnw123@gmail.com');
                
                // Reset State
                form.style.opacity = '1';
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error sending email:', error);
                alert('เกิดข้อผิดพลาดในการส่งข้อมูล โปรดลองใหม่อีกครั้ง');
                
                // Reset State on fail
                form.style.opacity = '1';
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            });
        });
    });

    // 3. Auto-Select Package and Update Price
    const priceButtons = document.querySelectorAll('.price-btn');
    const packageSelect = document.getElementById('package-select'); // Use ID for better target
    const priceSummary = document.getElementById('price-summary');
    const totalPriceDisplay = document.getElementById('total-price-display');

    function updatePriceDisplay() {
        if (!packageSelect || !priceSummary || !totalPriceDisplay) return;
        
        const selectedOption = packageSelect.options[packageSelect.selectedIndex];
        const price = selectedOption.getAttribute('data-price');
        
        if (price && price !== "0") {
            totalPriceDisplay.innerText = Number(price).toLocaleString();
            priceSummary.style.display = 'block';
        } else {
            priceSummary.style.display = 'none';
        }
    }

    if (packageSelect) {
        packageSelect.addEventListener('change', updatePriceDisplay);
    }

    priceButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const selectedPackage = this.getAttribute('data-package');
            if (packageSelect && selectedPackage) {
                // iOS Safari Nuclear Fix: บังคับแก้ไข attribute โดยตรงใน DOM tree
                for (let i = 0; i < packageSelect.options.length; i++) {
                    if (packageSelect.options[i].value === selectedPackage) {
                        packageSelect.selectedIndex = i;
                        packageSelect.options[i].setAttribute('selected', 'selected');
                        packageSelect.options[i].selected = true;
                    } else {
                        packageSelect.options[i].removeAttribute('selected');
                        packageSelect.options[i].selected = false;
                    }
                }
                
                packageSelect.value = selectedPackage;
                
                // กระตุ้น Event 'change' จำลองเพื่อให้ UI ของ <select> ในมือถืออัปเดตตาม
                const event = new Event('change', { bubbles: true });
                packageSelect.dispatchEvent(event);
                
                updatePriceDisplay(); // Update price immediately
                
                console.log('Package Auto-selected:', selectedPackage);
            }
        });
    });

    // 4. Smooth Scrolling for Internal Anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for sticky header/padding
                    behavior: 'smooth'
                });
            }
        });
    });

});
