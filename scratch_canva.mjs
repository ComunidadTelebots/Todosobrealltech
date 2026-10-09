import { chromium } from "file:///C:/Users/adria/OneDrive/Documentos/Visual Studio/Telegram/DBTeamV2/Todosobrealltech/.moon-insideads-panel/.browser-tools/node_modules/playwright-core/index.mjs";

async function run() {
    const browser = await chromium.launch({
        executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        headless: true,
        args: ["--disable-blink-features=AutomationControlled"]
    });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
    });
    const page = await context.newPage();
    try {
        await page.goto("https://www.canva.com/folder/FAHSS3pxI4o", { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(6000);
        const title = await page.title();
        const url = page.url();
        await page.screenshot({ path: "C:/Users/adria/.gemini/antigravity/brain/ef1d07ea-557e-46b6-bb49-1e1865a80299/canva_folder.png" });
        
        const data = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll("h1, h2, h3, h4, a, [role='button'], button, span"))
                .map(el => (el.textContent || "").trim())
                .filter(t => t.length > 2 && t.length < 80);
            return {
                bodyText: document.body.innerText.substring(0, 1000),
                uniqueTexts: Array.from(new Set(items)).slice(0, 50)
            };
        });
        console.log(JSON.stringify({ title, url, data }, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await browser.close();
    }
}
run();
