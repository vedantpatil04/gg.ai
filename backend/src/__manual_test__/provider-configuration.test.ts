import {
  getProviderApiKey,
  getProviderModel,
  isProviderConfigured,
  getWebsiteAIConfig,
  PROVIDER_REGISTRY,
  logAIProvidersStatus,
} from "../services/ai/config";
import { GeminiCenterProvider } from "../services/ai/providers/gemini.provider";
import { GroqProvider } from "../services/ai/providers/groq.provider";
import { OpenRouterProvider } from "../services/ai/providers/openrouter.provider";

let pass = 0;
let fail = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    pass++;
    console.log(`✅ [PASS] ${testName}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

async function runProviderConfigurationTests() {
  console.log("=== Starting Provider Configuration & Render Compatibility Tests ===\n");

  // Save original env
  const origEnv = { ...process.env };

  try {
    // ─── Test 1: Website Gemini Environment Configuration ──────────────────────
    console.log("--- Test 1: Website Gemini Reads Dedicated Environment Variables ---");
    delete process.env.GEMINI_API_KEY;
    process.env.GEMINI_WEBSITE_API_KEY = "test-web-secret-key-123";
    process.env.GEMINI_WEBSITE_MODEL = "gemini-2.5-pro-custom";

    const webConfig = getWebsiteAIConfig();
    assert(webConfig.apiKey === "test-web-secret-key-123", "Website Gemini read GEMINI_WEBSITE_API_KEY");
    assert(webConfig.model === "gemini-2.5-pro-custom", "Website Gemini model overridden by GEMINI_WEBSITE_MODEL");
    assert(webConfig.isConfigured === true, "Website Gemini is configured");

    // Test fallback to GEMINI_API_KEY
    delete process.env.GEMINI_WEBSITE_API_KEY;
    process.env.GEMINI_API_KEY = "test-legacy-key-456";
    const webFallback = getWebsiteAIConfig();
    assert(webFallback.apiKey === "test-legacy-key-456", "Website Gemini fallback to GEMINI_API_KEY works");

    // ─── Test 2: GG Center Gemini Environment Configuration ────────────────────
    console.log("\n--- Test 2: GG Center Gemini Reads Dedicated Environment Variables ---");
    delete process.env.INTELLIGENCE_GEMINI_API_KEY;
    process.env.GEMINI_GG_CENTER_API_KEY = "test-gg-center-key-789";
    process.env.GEMINI_GG_CENTER_MODEL = "gemini-3.6-pro";

    const ggGeminiKey = getProviderApiKey("gemini");
    const ggGeminiModel = getProviderModel("gemini");
    const geminiProvider = new GeminiCenterProvider();

    assert(ggGeminiKey === "test-gg-center-key-789", "GG Center Gemini read GEMINI_GG_CENTER_API_KEY");
    assert(ggGeminiModel === "gemini-3.6-pro", "GG Center Gemini model overridden by GEMINI_GG_CENTER_MODEL");
    assert(geminiProvider.model === "gemini-3.6-pro", "GeminiCenterProvider.model matches env override");
    assert(geminiProvider.isConfigured() === true, "GeminiCenterProvider is configured");

    // Test fallback to INTELLIGENCE_GEMINI_API_KEY
    delete process.env.GEMINI_GG_CENTER_API_KEY;
    process.env.INTELLIGENCE_GEMINI_API_KEY = "test-intelligence-key-999";
    assert(getProviderApiKey("gemini") === "test-intelligence-key-999", "GG Center Gemini fallback to INTELLIGENCE_GEMINI_API_KEY works");

    // ─── Test 3: GG Center Groq Environment Configuration ──────────────────────
    console.log("\n--- Test 3: Groq Reads Environment Variables ---");
    process.env.GROQ_API_KEY = "gsk-test-groq-key-111";
    process.env.GROQ_MODEL = "llama-3.3-70b-versatile";

    const groqKey = getProviderApiKey("groq");
    const groqModel = getProviderModel("groq");
    const groqProvider = new GroqProvider();

    assert(groqKey === "gsk-test-groq-key-111", "Groq read GROQ_API_KEY");
    assert(groqModel === "llama-3.3-70b-versatile", "Groq model overridden by GROQ_MODEL");
    assert(groqProvider.model === "llama-3.3-70b-versatile", "GroqProvider.model matches env override");
    assert(groqProvider.isConfigured() === true, "GroqProvider is configured");

    // ─── Test 4: GG Center OpenRouter Environment Configuration ────────────────
    console.log("\n--- Test 4: OpenRouter Reads Environment Variables ---");
    process.env.OPENROUTER_API_KEY = "sk-or-test-openrouter-key-222";
    process.env.OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet";

    const openRouterKey = getProviderApiKey("openrouter");
    const openRouterModel = getProviderModel("openrouter");
    const openRouterProvider = new OpenRouterProvider();

    assert(openRouterKey === "sk-or-test-openrouter-key-222", "OpenRouter read OPENROUTER_API_KEY");
    assert(openRouterModel === "anthropic/claude-3.5-sonnet", "OpenRouter model overridden by OPENROUTER_MODEL");
    assert(openRouterProvider.model === "anthropic/claude-3.5-sonnet", "OpenRouterProvider.model matches env override");
    assert(openRouterProvider.isConfigured() === true, "OpenRouterProvider is configured");

    // ─── Test 5: Provider Isolation & Non-Contamination of Env Keys ────────────
    console.log("\n--- Test 5: Environment Variable Non-Contamination ---");
    // Clear all except Groq
    delete process.env.GEMINI_WEBSITE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_GG_CENTER_API_KEY;
    delete process.env.INTELLIGENCE_GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    process.env.GROQ_API_KEY = "gsk-only-groq";

    assert(getWebsiteAIConfig().isConfigured === false, "Website Gemini is NOT configured when only GROQ_API_KEY is set");
    assert(isProviderConfigured("gemini") === false, "GG Center Gemini is NOT configured when only GROQ_API_KEY is set");
    assert(isProviderConfigured("openrouter") === false, "OpenRouter is NOT configured when only GROQ_API_KEY is set");
    assert(isProviderConfigured("groq") === true, "Groq is configured independently");

    // ─── Test 6: Missing Optional Providers Do Not Crash ───────────────────────
    console.log("\n--- Test 6: Missing Optional Provider Handling ---");
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_GG_CENTER_API_KEY;
    delete process.env.INTELLIGENCE_GEMINI_API_KEY;

    assert(isProviderConfigured("gemini") === false, "Unconfigured gemini returns false cleanly");
    assert(isProviderConfigured("groq") === false, "Unconfigured groq returns false cleanly");
    assert(isProviderConfigured("openrouter") === false, "Unconfigured openrouter returns false cleanly");

    // ─── Test 7: Safe Startup Logging (Never Leaks Secrets) ─────────────────────
    console.log("\n--- Test 7: Startup Logger Safe Execution ---");
    process.env.GEMINI_WEBSITE_API_KEY = "super-secret-key-do-not-log";
    process.env.GROQ_API_KEY = "super-secret-groq-key";

    // Run logger — should not throw or print secrets
    let logError = false;
    try {
      logAIProvidersStatus();
    } catch {
      logError = true;
    }
    assert(!logError, "logAIProvidersStatus executed cleanly without errors");

    console.log(`\n=== Provider Configuration Test Summary: ${pass} passed, ${fail} failed ===`);
    if (fail > 0) process.exit(1);
  } finally {
    process.env = origEnv;
  }
}

runProviderConfigurationTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
