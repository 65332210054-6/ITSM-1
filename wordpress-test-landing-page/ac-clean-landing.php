<?php
/**
 * Template Name: Premium AC Cleaning Service
 */

// 1. PHP Form Handler (ส่งเมล)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cus_name'])) {
    $to = 'jolnw123@gmail.com';
    $subject = '📢 มีรายการจองคิวล้างแอร์ใหม่! - ' . date('d/m/Y H:i');

    $name = sanitize_text_field($_POST['cus_name']);
    $tel = sanitize_text_field($_POST['cus_tel']);
    $package_raw = sanitize_text_field($_POST['cus_package']);
    $request = sanitize_textarea_field($_POST['cus_request']);

    // แปลงรหัสแพ็กเกจเป็นชื่อเต็มพร้อมราคาสำหรับแสดงผลในอีเมล
    $package_map = array(
        'standard' => 'แพ็กเกจมาตรฐาน (1 เครื่อง) - 600.-',
        'promo'    => 'โปรโมชั่นสุดคุ้ม (3 เครื่อง) - 1,500.-',
        'condo'    => 'เหมาคอนโด (2 เครื่อง) - 1,100.-'
    );
    $package_full = isset($package_map[$package_raw]) ? $package_map[$package_raw] : $package_raw;

    $message = "รายละเอียดการจอง:\n\n";
    $message .= "ชื่อลูกค้า: $name\n";
    $message .= "เบอร์โทรศัพท์: $tel\n";
    $message .= "แพ็กเกจที่เลือก: $package_full\n";
    $message .= "อาการ/ความต้องการ: $request\n\n";
    $message .= "วันที่ส่งข้อมูล: " . date('d/m/Y H:i:s');

    $headers = array('Content-Type: text/plain; charset=UTF-8');

    // ส่งเมลผ่าน WordPress
    $sent = wp_mail($to, $subject, $message, $headers);

    // ส่งค่ากลับไปหา JavaScript
    if (defined('DOING_AJAX') || isset($_GET['ajax'])) {
        echo json_encode(array('success' => $sent));
        exit;
    }
    $show_success_fallback = true;
}

add_filter('pre_get_document_title', function ($title) {
    return 'ล้างแอร์บ้านแบบ Premium โดยช่างมืออาชีพ - มั่นใจ รับประกัน 30 วัน';
}, 999);
add_action('wp_head', function () {
    echo '<style>header#site-header, footer#site-footer, .site-header, .site-footer:not(.custom-footer) { display: none !important; }</style>' . "\n";
    echo '<meta name="description" content="บริการล้างแอร์บ้านแบบพรีเมียม สะอาดลึกถึงภายใน กำจัดเชื้อราและกลิ่นอับ โดยช่างมืออาชีพที่ได้รับตรวจสอบประวัติ พร้อมรับประกันงาน 30 วัน ในราคาที่คุณพอใจ">' . "\n";
    echo '<link rel="canonical" href="' . home_url(add_query_arg(array(), $GLOBALS['wp']->request)) . '">' . "\n";
}, 1);
get_header();
?>
<!-- เพิ่ม ?v= ด้านหลังเพื่อให้เบราว์เซอร์ไม่อ่านไฟล์เก่าจากแคชครับ -->
<link rel="stylesheet" href="<?php echo get_template_directory_uri(); ?>/ac-clean-style.css?v=<?php echo time(); ?>">

<!-- 1. CUSTOM MINI HEADER (Logo & Contact) -->
<header class="nav-header">
    <div class="container nav-container">
        <a href="#" class="logo">
            <span style="font-size: 1.5rem; font-weight: 900; color: var(--primary-blue);">AIRCLEAN</span>
        </a>
        <div class="nav-contact">
            <span class="hide-mobile" style="margin-right: 15px; opacity: 0.7;">ช่างล้างแอร์มืออาชีพ</span>
            <a href="tel:0800000000" class="btn-main" style="padding: 10px 20px; font-size: 0.9rem;">📞 โทรเลย</a>
        </div>
    </div>
</header>

<main class="ac-landing-page">
    <section id="ac-hero">
        <div class="container">
            <h1>ล้างแอร์แบบ Premium<br>เย็นฉ่ำสู้หน้าร้อน มั่นใจช่างมืออาชีพ</h1>
            <p>แอร์ไม่เย็น? มีกลิ่นอับ? เราช่วยได้! ล้างแอร์สะอาดลึกถึงภายใน พร้อมรับประกันงาน 30 วัน
                ด้วยมาตรฐานเครื่องมือระดับสูง</p>
            <div class="hero-cta-group">
                <a href="#booking" class="btn-main">จองคิวล้างแอร์วันนี้</a>
                <a href="#pricing" class="btn-outline">เช็กราคาโปรโมชั่น</a>
            </div>
        </div>
    </section>

    <div class="container" style="position: relative; z-index: 10;">
        <section class="trust-icons">
            <div class="trust-item">
                <div style="font-size: 2rem; color: #ffc107;">★ 5.0</div><span>รีวิวจากลูกค้าคอนโด</span>
            </div>
            <div class="trust-item">
                <div style="font-size: 2rem; color: #007bff;">✓</div><span>รับประกันงาน 30 วัน</span>
            </div>
            <div class="trust-item">
                <div style="font-size: 2rem; color: #28a745;">Verified</div><span>ช่างผ่านการตรวจประวัติ</span>
            </div>
        </section>
    </div>

    <section id="pricing" class="section-padding" style="background: #fff;">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 40px;">ราคาค่าบริการ</h2>
            <div class="price-grid">
                <!-- ราคาปกติ 1 -->
                <div class="price-card">
                    <div class="price-header">มาตรฐาน</div>
                    <div class="price-value">600<span>.-</span></div>
                    <ul class="price-features">
                        <li>ล้างแอร์ติดผนัง 1 เครื่อง</li>
                        <li>ตรวจเช็กระบบน้ำยาฟรี</li>
                        <li>รับประกันงาน 30 วัน</li>
                    </ul>
                    <a href="#booking" class="btn-outline price-btn" data-package="standard"
                        style="display: block; text-align: center;">เลือกแพ็กเกจ</a>
                </div>

                <!-- ราคาโปรโมชั่น (เด่นที่สุด) -->
                <div class="price-card promo">
                    <div class="promo-badge">HOT PROMO</div>
                    <div class="price-header">คุ้มค่าที่สุด (3 เครื่อง)</div>
                    <div class="price-value">1,500<span>.-</span></div>
                    <div style="text-decoration: line-through; opacity: 0.6; font-size: 1rem;">ปกติ 1,800.-</div>
                    <ul class="price-features">
                        <li>ล้างแอร์ 3 เครื่อง (เฉลี่ย 500.-)</li>
                        <li>ฆ่าเชื้อแบคทีเรียฟรีทุกเครื่อง</li>
                        <li>คิวล้างเร่งด่วน ภายใน 24 ชม.</li>
                        <li>รับประกันงาน 30 วัน</li>
                    </ul>
                    <a href="#booking" class="btn-main price-btn" data-package="promo"
                        style="display: block; text-align: center;">จองโปรโมชั่นนี้</a>
                </div>

                <!-- ราคาปกติ 2 -->
                <div class="price-card">
                    <div class="price-header">เหมาคอนโด (2 เครื่อง)</div>
                    <div class="price-value">1,100<span>.-</span></div>
                    <div style="opacity: 0.6; font-size: 1rem;">ตกเครื่องละ 550.-</div>
                    <ul class="price-features">
                        <li>ล้างแอร์ 2 เครื่อง</li>
                        <li>เช็กระบบน้ำยา + ล้างถาดน้ำทิ้ง</li>
                        <li>รับประกันงาน 30 วัน</li>
                    </ul>
                    <a href="#booking" class="btn-outline price-btn" data-package="condo"
                        style="display: block; text-align: center;">เลือกแพ็กเกจ</a>
                </div>
            </div>
        </div>
    </section>

    <section class="section-padding">
        <div class="container">
            <h2 style="text-align: center; margin-bottom: 40px;">ทำไมต้องเลือกเรา?</h2>
            <div class="service-grid">
                <div class="service-card">
                    <h3>🛡️ ล้างแอร์ด้วยน้ำยาฆ่าเชื้อ</h3>
                    <p>เราใช้น้ำยาฉีดล้างเฉพาะทางที่กำจัดเชื้อรา แบคทีเรีย และกลิ่นอับได้อย่างหมดจดโดยไม่ทำลายฟินคอยล์
                    </p>
                </div>
                <div class="service-card">
                    <h3>👨‍🔧 ช่างมืออาชีพ ตรงต่อเวลา</h3>
                    <p>ทีมช่างมีความชำนาญสูง แต่งตัวสุภาพ รักษาความสะอาดหน้างาน และมาตรงเวลานัดหมาย 100%</p>
                </div>
                <div class="service-card">
                    <h3>💰 ราคาโปร่งใส ไม่มีบวกเพิ่ม</h3>
                    <p>ประเมินราคาจริงตามหน้างาน แจ้งราคาก่อนเริ่มทำ ไม่มีการเก็บเพิ่มจุกจิก หน้าสัญญามีความชัดเจน</p>
                </div>
            </div>
        </div>
    </section>

    <section id="booking" class="section-padding" style="background: #eef2f7;">
        <div class="container">
            <div id="booking-form">
                <h2 style="text-align: center; margin-bottom: 30px;">ประเมินราคา / จองคิวล้างแอร์</h2>

                <div id="form-success"
                    style="display: <?php echo isset($show_success_fallback) ? 'block' : 'none'; ?>; text-align: center; padding: 40px 0;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">✅</div>
                    <h3 style="margin-bottom: 10px;">ได้รับข้อมูลการจองแล้ว!</h3>
                    <p>เจ้าหน้าที่จะติดต่อกลับที่เบอร์ของคุณภายใน 15 นาทีครับ</p>
                </div>

                <form id="ac-conversion-form" action="#booking-form" method="POST"
                    style="display: <?php echo isset($show_success_fallback) ? 'none' : 'block'; ?>">
                    <div class="form-group">
                        <label>เลือกแพ็กเกจที่ต้องการ</label>
                        <select name="cus_package" id="package-select"
                            style="width: 100%; padding: 18px; border-radius: 15px; border: 1px solid #ddd; font-family: inherit; font-size: 1rem; appearance: none; background: white url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22/%3E%3C/svg%3E') no-repeat right 15px center; background-size: 12px auto;">
                            <option value="" data-price="0">-- โปรดเลือกแพ็กเกจ --</option>
                            <option value="standard" data-price="600">แพ็กเกจมาตรฐาน (1 เครื่อง) - 600.-</option>
                            <option value="promo" data-price="1500">โปรโมชั่นสุดคุ้ม (3 เครื่อง) - 1,500.-</option>
                            <option value="condo" data-price="1100">เหมาคอนโด (2 เครื่อง) - 1,100.-</option>
                        </select>
                    </div>

                    <!-- ส่วนแสดงราคาสรุป (Green-White Theme) -->
                    <div id="price-summary"
                        style="display: none; background: #ffffff; padding: 25px; border-radius: 20px; margin-bottom: 30px; border-left: 8px solid #28a745; box-shadow: 0 15px 30px rgba(0,0,0,0.1);">
                        <span style="font-size: 0.9rem; color: #6c757d; font-weight: 500;">ยอดรวมที่ต้องชำระ:</span>
                        <div style="font-size: 2.2rem; font-weight: 800; color: #28a745; line-height: 1.2;">฿ <span
                                id="total-price-display">0</span>.-</div>
                    </div>
                    <div class="form-group"><label>ชื่อ-นามสกุลของคุณ</label><input type="text" name="cus_name"
                            placeholder="ระบุชื่อจริง..." required></div>
                    <div class="form-group"><label>เบอร์โทรศัพท์ที่ติดต่อได้</label><input type="tel" name="cus_tel"
                            placeholder="08x-xxxxxxx" required></div>
                    <div class="form-group"><label>ระบุอาการ / จำนวนเครื่อง</label><input type="text" name="cus_request"
                            placeholder="เช่น แอร์ไม่เย็น, มีน้ำหยด"></div>
                    <button type="submit" class="btn-submit">ยืนยันการจอง / ส่งข้อมูล</button>
                </form>
            </div>
            <!-- MOBILE STICKY CTA -->
            <div class="sticky-footer">
                <a href="#booking" class="btn-sticky call-btn"
                    style="display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.2;">
                    <span>จองคิว</span>
                    <span>24 ชม.</span>
                </a>
                <a href="https://line.me/ti/p/Pwe6ppL29n" class="btn-sticky line-btn" aria-label="Add Line"
                    style="background: transparent; padding: 0; display: flex; align-items: center; justify-content: center;">
                    <!-- ใช้รูปภาพจริงจาก Official Source แทนการเขียนเองครับ -->
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" alt="LINE"
                        style="width: 50px; height: 50px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
                </a>
            </div>
</main>

<footer class="site-footer custom-footer">
    <div class="container">
        <div class="footer-grid">
            <!-- Column 1: Brand Info -->
            <div class="footer-col">
                <div class="footer-logo">
                    <span style="font-size: 1.5rem; font-weight: 900; color: #fff;">AIRCLEAN</span>
                    <span
                        style="display: block; font-size: 0.8rem; color: var(--primary-blue); font-weight: 700; letter-spacing: 2px;">SERVICE</span>
                </div>
                <p class="footer-desc">
                    บริการล้างแอร์บ้านและคอนโดระดับพรีเมียม สะอาด มั่นใจ ด้วยทีมช่างมืออาชีพที่ได้รับตรวจสอบประวัติ
                    พร้อมรับประกันงาน 30 วัน
                </p>
            </div>

            <!-- Column 2: Quick Links -->
            <div class="footer-col">
                <h4 class="footer-title">เมนู</h4>
                <ul class="footer-links">
                    <li><a href="#ac-hero">หน้าหลัก</a></li>
                    <li><a href="#pricing">ราคาค่าบริการ</a></li>
                    <li><a href="<?php echo home_url('/?page_id=22'); ?>">นโยบายความเป็นส่วนตัว</a></li>
                    <li><a href="<?php echo home_url('/?page_id=24'); ?>">เงื่อนไขการใช้บริการ</a></li>
                </ul>
            </div>

            <!-- Column 3: Contact Info -->
            <div class="footer-col">
                <h4 class="footer-title">ติดต่อเรา</h4>
                <ul class="footer-contact-list">
                    <li><span>📞</span> 080-000-0000</li>
                    <li><span>💬</span> Line ID: @premiumac</li>
                    <li><span>📍</span> 123 ถนนสุขุมวิท, กรุงเทพฯ 10110</li>
                    <li><span>⏰</span> ทุกวัน 08:00 - 20:00 น.</li>
                </ul>
            </div>
        </div>

        <div class="footer-bottom">
            <p class="copyright">
                &copy; <?php echo date('Y'); ?> Premium Service. All rights reserved.
            </p>
        </div>
    </div>
</footer>

<script>
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
</script>

<?php wp_footer(); ?>
</body>
</html>