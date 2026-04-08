<?php
/**
 * Template Name: Privacy Policy
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
        <h1 style="margin-bottom: 40px; color: var(--primary-blue);">Privacy Policy (นโยบายความเป็นส่วนตัว)</h1>

        <section style="margin-bottom: 40px;">
            <h2>1. ข้อมูลที่เราเก็บรวบรวม (Information We Collect)</h2>
            <p>เราเก็บรวบรวมข้อมูลส่วนบุคคลที่คุณให้ไว้ผ่านฟอร์มการจองบนเว็บไซต์ของเรา ซึ่งประกอบด้วย:</p>
            <ul>
                <li>ชื่อ-นามสกุล</li>
                <li>เบอร์โทรศัพท์</li>
                <li>ความต้องการหรือรายละเอียดการจองบริการล้างแอร์</li>
            </ul>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>2. วัตถุประสงค์ในการใช้ข้อมูล (How We Use Your Information)</h2>
            <p>เราใช้ข้อมูลของคุณเพื่อวัตถุประสงค์หลักดังนี้:</p>
            <ul>
                <li>เพื่อใช้ในการติดต่อประสานงาน และนัดหมายบริการล้างแอร์</li>
                <li>เพื่อใช้ในการประเมินราคาและยืนยันการรับบริการ</li>
                <li>เพื่อใช้ในการส่งข้อมูลยืนยันผ่านทาง SMS หรือโทรศัพท์</li>
            </ul>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>3. การคุ้มครองข้อมูลส่วนบุคคล (Data Protection)</h2>
            <p>เราให้ความสำคัญกับความปลอดภัยของข้อมูลคุณอย่างสูงสุด
                ข้อมูลของคุณจะถูกใช้ภายในทีมงานผู้ให้บริการล้างแอร์ของเราเท่านั้น
                และจะไม่มีการขายหรือส่งต่อข้อมูลให้แก่บุคคลที่สามโดยไม่ได้รับความยินยอมจากคุณ
                ยกเว้นจะถูกขอให้เป็นอย่างอื่นภายใต้กฎหมายที่เกี่ยวข้อง</p>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>4. สิทธิ์ของคุณ (Your Rights)</h2>
            <p>คุณมีสิทธิ์ในการติดต่อเราเพื่อขอดูข้อมูล แก้ไขข้อมูล
                หรือขอให้ลบข้อมูลส่วนบุคคลของคุณออกจากระบบได้ทุกเมื่อ
                โดยสามารถแจ้งผ่านทางช่องทางการติดต่อที่ปรากฏบนเว็บไซต์</p>
        </section>

        <section style="margin-bottom: 40px;">
            <h2>5. การเปลี่ยนแปลงนโยบาย (Changes to This Policy)</h2>
            <p>เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้ตามความเหมาะสมเพื่อให้สอดคล้องกับการเปลี่ยนแปลงของการให้บริการและข้อบังคับทางกฎหมาย
                โดยจะแจ้งให้ทราบผ่านทางหน้าเว็บไซต์</p>
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