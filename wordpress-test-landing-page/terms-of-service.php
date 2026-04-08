<?php
/**
 * Template Name: Terms of Service
 */
add_action('wp_head', function() {
    echo '<style>header#site-header, footer#site-footer, .site-header, .site-footer:not(.custom-footer) { display: none !important; }</style>' . "\n";
}, 1);
get_header();
?>
<link rel="stylesheet" href="<?php echo get_template_directory_uri(); ?>/ac-clean-style.css?v=<?php echo time(); ?>">

<!-- ส่วนหัว (Header) - แทนที่ Header เดิมของธีม -->
<nav class="nav-header">
    <div class="container nav-container">
        <a href="<?php echo home_url('/'); ?>" class="logo" style="text-decoration: none;">
            <span style="font-weight: 900; font-size: 1.5rem; color: var(--primary-blue);">AIRCLEAN</span>
        </a>
        <div class="header-right" style="display: flex; align-items: center;">
            <span class="hide-mobile" style="font-size: 0.8rem; color: var(--text-muted); margin-right: 15px;">ช่างล้างแอร์มืออาชีพ</span>
            <a href="tel:0800000000" class="btn-main" style="padding: 10px 20px; font-size: 0.9rem;">
                <span style="margin-right: 5px;">📞</span> โทรเลย
            </a>
        </div>
    </div>
</nav>

<main class="ac-landing-page" style="background: #fff; padding: 100px 0;">
    <div class="container" style="max-width: 800px;">
        <h1 style="margin-bottom: 40px; color: var(--primary-blue);">Terms of Service (เงื่อนไขการใช้บริการ)</h1>

        <section style="margin-bottom: 40px;">
            <h2>1. ขอบเขตของการบริการ (Service Scope)</h2>
            <p>เราให้บริการล้างแอร์บ้าน ล้างคอนโด พร้อมตรวจเช็กระบบน้ำยาแอร์เบื้องต้น
                โดยทีมช่างผู้ชำนาญการที่ได้รับการตรวจสอบประวัติแล้วเท่านั้น</p>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>2. การรับประกันบริการ (30-Day Warranty)</h2>
            <p>เรารับประกันความพึงพอใจในการให้บริการล้างแอร์เป็นเวลา 30 วัน นับตั้งแต่วันที่เข้าดำเนินการ
                โดยครอบคลุมหากมีเหตุน้ำยารั่วซึมจากการล้าง หรือความชำรุดที่เกิดจากการล้างโดยตรง
                หากพบปัญหาแจ้งเราเพื่อส่งช่างเข้าตรวจสอบโดยเร็วที่สุด</p>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>3. การนัดหมายและการยกเลิก (Booking & Cancellations)</h2>
            <p>คุณสามารถแจ้งการยกเลิกหรือเลื่อนนัดหมายได้ล่วงหน้าอย่างน้อย 24 ชั่วโมงก่อนเวลาเข้าดำเนินการรับบริการจริง
                เพื่อความสะดวกในการจัดคิวงานแก่ลูกค้ารายอื่นๆ</p>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>4. ความรับผิดชอบ (Limitation of Liability)</h2>
            <p>เราขอสงวนสิทธิในการไม่รับผิดชอบต่อความเสียหายที่อยู่นอกเหนือจากขอบเขตการล้างแอร์
                หรือความเสียหายที่เกิดจากระบบไฟฟ้าดั้งเดิมของอาคารคุณ ทั้งนี้ทีมช่างจะแจ้งความเสี่ยงเบื้องต้น (เช่น
                ระบบแอร์เก่ามาก หรือระบบน้ำยาผิดปกติ) ให้ทราบก่อนเริ่มดำเนินการทุกครั้ง</p>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>5. ช่องทางการติดต่อ (Contact Information)</h2>
            <p>หากคุณมีคำถามหรือข้อสงสัยเกี่ยวกับเงื่อนไขการใช้บริการ สามารถติดต่อเราผ่านทางเบอร์โทรศัพท์
                หรือช่องทางออนไลน์ที่ปรากฏบนเว็บไซต์ได้ทันที</p>
        </section>

        <div style="margin-top: 60px; text-align: center;">
            <a href="<?php echo home_url(); ?>" class="btn-main" style="display: inline-block;">กลับหน้าหลัก</a>
        </div>
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
                    <li><a href="<?php echo home_url('/#ac-hero'); ?>">หน้าหลัก</a></li>
                    <li><a href="<?php echo home_url('/#pricing'); ?>">ราคาค่าบริการ</a></li>
                    <li><a href="<?php echo home_url('/#booking'); ?>">จองคิวออนไลน์</a></li>
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

<script src="<?php echo get_template_directory_uri(); ?>/ac-clean-scripts.js?v=<?php echo time(); ?>" async></script>
<?php get_footer(); ?>