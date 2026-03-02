"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var dotenv_1 = __importDefault(require("dotenv"));
var generative_ai_1 = require("@google/generative-ai");
var supabase_js_1 = require("@supabase/supabase-js");
var pdfParse = require('pdf-parse');
// Load environment variables from .env.local
var envPath = path_1.default.resolve(process.cwd(), '../app/.env.local');
dotenv_1.default.config({ path: envPath });
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
var geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error("Missing required environment variables in ../app/.env.local (Need Supabase and GOOGLE_GENERATIVE_AI_API_KEY)");
    process.exit(1);
}
var supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
var genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
var embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
// Configuration
var KNOWLEDGE_BASE_DIR = path_1.default.resolve(process.cwd(), '../dnd-campaign');
var CHUNK_SIZE = 1000; // characters
var CHUNK_OVERLAP = 200; // characters
function extractTextFromPDF(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var dataBuffer, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dataBuffer = fs_1.default.readFileSync(filePath);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, pdfParse(dataBuffer)];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, data.text];
                case 3:
                    err_1 = _a.sent();
                    console.error("Error parsing PDF ".concat(filePath, ":"), err_1);
                    return [2 /*return*/, ''];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function chunkText(text, chunkSize, overlap) {
    var chunks = [];
    var i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks;
}
function processFile(filePath, relativePath) {
    return __awaiter(this, void 0, void 0, function () {
        var text, ext, chunks, i, chunk, result, embedding, error, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Processing: ".concat(relativePath));
                    text = '';
                    ext = path_1.default.extname(filePath).toLowerCase();
                    if (!(ext === '.md' || ext === '.txt')) return [3 /*break*/, 1];
                    text = fs_1.default.readFileSync(filePath, 'utf-8');
                    return [3 /*break*/, 4];
                case 1:
                    if (!(ext === '.pdf')) return [3 /*break*/, 3];
                    return [4 /*yield*/, extractTextFromPDF(filePath)];
                case 2:
                    text = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    console.log("Skipping unsupported file type: ".concat(ext));
                    return [2 /*return*/];
                case 4:
                    if (!text.trim()) {
                        console.log("Skipping empty file: ".concat(relativePath));
                        return [2 /*return*/];
                    }
                    // Clean up text (remove excessive newlines/spaces)
                    text = text.replace(/\n+/g, '\n').replace(/\s+/g, ' ').trim();
                    chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);
                    console.log("Created ".concat(chunks.length, " chunks for ").concat(relativePath));
                    i = 0;
                    _a.label = 5;
                case 5:
                    if (!(i < chunks.length)) return [3 /*break*/, 11];
                    chunk = chunks[i];
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 9, , 10]);
                    return [4 /*yield*/, embeddingModel.embedContent(chunk)];
                case 7:
                    result = _a.sent();
                    embedding = result.embedding.values;
                    return [4 /*yield*/, supabase.from('document_chunks').insert({
                            document_name: relativePath,
                            chunk_content: chunk,
                            embedding: embedding,
                            metadata: {
                                chunk_index: i,
                                total_chunks: chunks.length,
                                file_type: ext
                            }
                        })];
                case 8:
                    error = (_a.sent()).error;
                    if (error) {
                        console.error("Supabase insert error for ".concat(relativePath, " chunk ").concat(i, ":"), error.message);
                    }
                    return [3 /*break*/, 10];
                case 9:
                    err_2 = _a.sent();
                    console.error("OpenAI embedding error for ".concat(relativePath, " chunk ").concat(i, ":"), err_2.message);
                    return [3 /*break*/, 10];
                case 10:
                    i++;
                    return [3 /*break*/, 5];
                case 11:
                    console.log("\u2705 Finished processing ".concat(relativePath));
                    return [2 /*return*/];
            }
        });
    });
}
function walkDirAndProcess(dir_1) {
    return __awaiter(this, arguments, void 0, function (dir, baseDir) {
        var files, _i, files_1, file, fullPath, relPath, stat;
        if (baseDir === void 0) { baseDir = ''; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    files = fs_1.default.readdirSync(dir);
                    _i = 0, files_1 = files;
                    _a.label = 1;
                case 1:
                    if (!(_i < files_1.length)) return [3 /*break*/, 6];
                    file = files_1[_i];
                    // Skip hidden files or ignored folders
                    if (file.startsWith('.'))
                        return [3 /*break*/, 5];
                    fullPath = path_1.default.join(dir, file);
                    relPath = path_1.default.join(baseDir, file);
                    stat = fs_1.default.statSync(fullPath);
                    if (!stat.isDirectory()) return [3 /*break*/, 3];
                    return [4 /*yield*/, walkDirAndProcess(fullPath, relPath)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, processFile(fullPath, relPath)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🚀 Starting D&D Knowledge Base Ingestion...");
                    if (!fs_1.default.existsSync(KNOWLEDGE_BASE_DIR)) {
                        console.error("Directory not found: ".concat(KNOWLEDGE_BASE_DIR));
                        process.exit(1);
                    }
                    // Clear existing chunks (optional, prevents duplicates on re-run)
                    /*
                    console.log("Clearing existing document_chunks...");
                    const { error: deleteError } = await supabase.from('document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    if (deleteError) console.error("Error clearing table:", deleteError);
                    */
                    return [4 /*yield*/, walkDirAndProcess(KNOWLEDGE_BASE_DIR)];
                case 1:
                    // Clear existing chunks (optional, prevents duplicates on re-run)
                    /*
                    console.log("Clearing existing document_chunks...");
                    const { error: deleteError } = await supabase.from('document_chunks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    if (deleteError) console.error("Error clearing table:", deleteError);
                    */
                    _a.sent();
                    console.log("✨ Data ingestion complete!");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
