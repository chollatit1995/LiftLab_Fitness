// แยกไว้นอกไฟล์ "use client" — layout.tsx เป็น server component
// ถ้า import ค่าคงที่จากไฟล์ client ตรง ๆ จะได้ client reference แทนตัวสตริง

export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "liftlab-theme";

/**
 * สคริปต์ที่ฝังใน <head> ให้ใส่คลาส dark ก่อนหน้าเว็บวาดครั้งแรก
 * ไม่งั้นคนที่ใช้โหมดมืดจะเห็นหน้าขาวแวบก่อนทุกครั้งที่โหลด
 */
export const themeInitScript = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;
