/* Local browser acceptance bootstrap. Blocks every non-loopback HTTP request. */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  const installed=join(homedir(),'Desktop','MathPhysics','.test-deps','browsers');
  if (existsSync(installed)) process.env.PLAYWRIGHT_BROWSERS_PATH=installed;
}
const {chromium}=await import('playwright');
const launch=chromium.launch.bind(chromium);
chromium.launch=async options=>{
  const settings={...options};
  if (!process.env.CHROMIUM_EXECUTABLE && settings.executablePath && !existsSync(settings.executablePath)) delete settings.executablePath;
  settings.args=[...(settings.args||[]),'--disable-background-networking','--disable-component-update','--no-default-browser-check'];
  const browser=await launch(settings),newContext=browser.newContext.bind(browser);
  browser.newContext=async (...args)=>{
    const context=await newContext(...args);
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if (url.protocol==='file:' || ['127.0.0.1','localhost','[::1]'].includes(url.hostname)) return route.continue();
      return route.abort('blockedbyclient');
    });
    return context;
  };
  return browser;
};
