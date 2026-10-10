// Simulate Thymeleaf [[${expr}]] rendering EXACTLY as Thymeleaf does
// in th:inline="javascript" mode

const fs = require('fs');
const path = require('path');

// Thymeleaf th:inline="javascript" behavior:
// [[${string}]]  -> "string" (double-quoted, escaped)
// [[${number}]]  -> number
// [[${boolean}]] -> true/false
// [[${null}]]    -> null (actually renders as: null)
// [[${list}]]    -> [elem1, elem2]
// [[${object}]]  -> {key: val}
// [[@{${expr}}]]  -> ??? (URI expression, may NOT quote!)
// [(${expr})]      -> raw unescaped string

function thymeleafJS(expr) {
  // Returns what Thymeleaf renders for an expression in JS context
  if (expr === null || expr === undefined) return 'null';
  if (typeof expr === 'boolean') return String(expr);
  if (typeof expr === 'number') return String(expr);
  if (typeof expr === 'string') return JSON.stringify(expr);
  if (Array.isArray(expr)) return '[' + expr.map(thymeleafJS).join(', ') + ']';
  if (typeof expr === 'object') {
    return '{' + Object.entries(expr).map(([k, v]) => 
      JSON.stringify(k) + ': ' + thymeleafJS(v)).join(', ') + '}';
  }
  return 'null';
}

function thymeleafURI(expr) {
  // @{} URI expression - renders as a path/string WITHOUT quotes in some versions!
  // This is the BUG: [[@{${expr}}]] does NOT produce a quoted JS string
  if (expr === null || expr === undefined) return 'null';
  if (typeof expr === 'string') return expr;  // NO QUOTES - this is the bug!
  return String(expr);
}

function thymeleafRaw(expr) {
  // (${expr}) - raw unescaped
  if (expr === null || expr === undefined) return '';
  return String(expr);
}

// Now let's simulate the actual site-config.html rendering
// Using realistic config values from settings.yaml

const config = {
  htmlType: 'index',
  assets_link: '/themes/theme-hao/assets',
  theme: {
    config: {
      other: {
        vanillaLazyload: {
          enable: true,
          errorImg: '/themes/theme-hao/assets/images/404.gif',  // From settings.yaml
          loadingImg: 'data:image/svg+xml,...'
        },
        loadingBoxs: { loadingBoxEnable: false, loadProgressBar: false }
      },
      footer: { footer_group: { enable_footer_group: false, num: 8 } },
      code: {
        enable: true, enable_title: true, enable_hr: true,
        enable_line: true, enable_copy: true, enable_expander: true,
        enable_height_limit: false
      },
      comments: {
        use: 'Waline',
        commentBarrageConfig: {
          maxBarrage: 100, barrageTime: 500, mailMd5: ''
        },
        walines: {
          serverURL: 'https://example.com',
          locale: 'zh-CN',
          walinesJs: ''
        }
      },
      post: {
        aiDescription: { aiDescriptionEnable: false },
        dynamicBackground: false,
        readAloudEnable: true,
        aiAssistantEnable: true
      },
      tool: { snackbar: { switch: true } },
      sidebar: { power: { powerLink: '', username: '', showNum: 0 }, profile: { helloText: '', profileStyle: '' } },
      style: { themeLightSkin: '#ffffff', themeDarkSkin: '#1d1b20', translate: { defaultEncoding: 'utf-8' }, colorScheme: 'light' }
    }
  },
  siteTitle: 'My Blog'
};

// Read site-config.html
const siteConfig = fs.readFileSync('D:/Documents/halo-theme-hao/templates/modules/variables/site-config.html', 'utf8');

// Simulate rendering
let rendered = siteConfig;

// Replace [[${expr}]] with JS literal
rendered = rendered.replace(/\[\[(\$\{[^}]+\})\]\]/g, (match, expr) => {
  // Extract the variable path from the expression
  // For simplicity, evaluate known patterns
  return thymeleafJS(evalExpression(expr, config));
});

// Helper to evaluate Thymeleaf expressions (simplified)
function evalExpression(expr, ctx) {
  // Remove ${} wrapper
  let code = expr.replace(/^\$\{/, '').replace(/\}$/, '');
  
  // Very simplified evaluation - just return expected values
  if (code.includes('htmlType')) return ctx.htmlType;
  if (code.includes('vanillaLazyload.enable')) return ctx.theme.config.other.vanillaLazyload.enable;
  if (code.includes('vanillaLazyload.errorImg')) return ctx.theme.config.other.vanillaLazyload.errorImg;
  if (code.includes('powerLink')) return ctx.theme.config.sidebar.power.powerLink;
  if (code.includes('username')) return ctx.theme.config.sidebar.power.username;
  if (code.includes('showNum')) return ctx.theme.config.sidebar.power.showNum ?: 0;
  if (code.includes('jQuery')) return ctx.assets_link + '/libs/jquery/jquery.min.js';
  if (code.includes('isPost')) return ctx.htmlType == 'post';
  if (code.includes('isHome')) return ctx.htmlType == 'index';
  if (code.includes('helloText')) return '';
  if (code.includes('profileStyle')) return '';
  
  return null;
}

// Actually, let's just manually construct the rendered site-config
console.log("=== MANUAL RENDERING of site-config.html (index page) ===\n");

const renderedConfig = [];
renderedConfig.push('<script id="site-config" th:inline="javascript">');
renderedConfig.push('    var GLOBAL_CONFIG = {');
renderedConfig.push('        // 页面类型');
renderedConfig.push('        htmlType: "index",');
renderedConfig.push('        postTitle: "",');
renderedConfig.push('        isPost: false,');
renderedConfig.push('        isHome: true,');
renderedConfig.push('        copyright: undefined,');
renderedConfig.push('        lightbox: \'fancybox\',');
renderedConfig.push('        lazyload: {');
renderedConfig.push('            enable: true,');

// THE CRITICAL LINE - what [[@{${errorImg}}]] renders as:
console.log("=== Testing [[@{${errorImg}}]] rendering ===");
console.log("errorImg = '/themes/theme-hao/assets/images/404.gif'");

// Thymeleaf @{} URI expression behavior in th:inline="javascript":
// The @{} syntax creates a URL. When wrapped in [[...]], it renders the URL as a STRING
// BUT: the behavior depends on Thymeleaf version and context

// In standard Thymeleaf:
// [[@{${expr}}]] -> Thymeleaf processes @{} as URL -> renders the URL STRING (quoted)
// This SHOULD be: "/themes/.../404.gif"

// BUT in some configurations or older versions, @{} might not add quotes
// Let's test both cases:

console.log("\nCase 1: @{} renders as quoted string (expected):");
let case1 = '            error: "/themes/theme-hao/assets/images/404.gif"';
console.log(case1);
try { eval(case1.replace('            error: ', 'var x = { error: ') + ';'); console.log('  VALID'); } 
catch(e) { console.log('  ERROR:', e.message); }

console.log("\nCase 2: @{} renders as UNQUOTED (the bug):");
let case2 = '            error: /themes/theme-hao/assets/images/404.gif';
console.log(case2);
try { eval('var x = { error: /themes/theme-hao/assets/images/404.gif });'); console.log('  Valid (regex)'); } 
catch(e) { console.log('  ERROR:', e.message); }

console.log("\n=== The fix changes [[@{${expr}}]] to [[${expr}]] ===");
console.log("[[${expr}]] always produces a JS string literal (quoted)");
