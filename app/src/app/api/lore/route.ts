import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { reindexFile } from '../../../lib/lore-ingestion';

export const dynamic = 'force-dynamic';

export interface LoreFile {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: LoreFile[];
}

const SHARED_FILE_PATHS = new Set([
    'materiale-sorgente/Dungeon and Dragons Manuale del giocatore (1).txt',
    'materiale-sorgente/players_handbook.txt',
    'materiale-sorgente/Tashas_Cauldron_of_Everything.txt',
    'materiale-sorgente/tcoe.txt',
    'materiale-sorgente/eberron rinascita dopo l\'ultima guerra.txt',
    'materiale-sorgente/esplorando eberron.txt',
    'materiale-sorgente/profezia-eterna-notte.txt',
    'materiale-sorgente/bestiario/manuale-mostri-srd.md',
]);

const SHARN_ONLY_PATHS = new Set([
    'materiale-sorgente/appunti-campagna.txt',
    'materiale-sorgente/campaign_status.md',
    'materiale-sorgente/puzzles_tasha.md',
    'materiale-sorgente/sharn-punti-di-interesse-ITA.md',
]);

const SHARN_ONLY_DIR_PREFIXES = [
    'sharn/',
    'materiale-sorgente/ambientazione/',
    'materiale-sorgente/avventure/',
    'materiale-sorgente/npc/',
];

function toPosixPath(relPath: string) {
    return relPath.split(path.sep).join('/');
}

function normalizeCampaignSlug(value: string | null) {
    return (value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function isVisiblePath(relPath: string, campaignSlug: string) {
    const normalizedPath = toPosixPath(relPath);
    const normalizedCampaign = normalizeCampaignSlug(campaignSlug);

    if (SHARED_FILE_PATHS.has(normalizedPath)) return true;

    if (normalizedCampaign === 'sharn') {
        if (SHARN_ONLY_PATHS.has(normalizedPath)) return true;
        if (SHARN_ONLY_DIR_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) return true;
    }

    if (!normalizedCampaign) return false;

    return (
        normalizedPath.startsWith(`${normalizedCampaign}/`) ||
        normalizedPath.startsWith(`materiale-sorgente/${normalizedCampaign}/`)
    );
}

function getFilesTree(dir: string, campaignSlug: string, baseDir: string = ''): LoreFile[] {
    const p = path.join(dir, baseDir);
    if (!fs.existsSync(p)) return [];

    const items = fs.readdirSync(p, { withFileTypes: true });
    const result: LoreFile[] = [];

    for (const item of items) {
        if (item.name.startsWith('.')) continue;

        const relPath = path.join(baseDir, item.name);
        const normalizedRelPath = toPosixPath(relPath);

        if (item.isDirectory()) {
            const children = getFilesTree(dir, campaignSlug, relPath);
            if (children.length > 0) {
                result.push({
                    name: item.name,
                    path: normalizedRelPath,
                    isDirectory: true,
                    children,
                });
            }
        } else if ((item.name.endsWith('.md') || item.name.endsWith('.txt')) && isVisiblePath(normalizedRelPath, campaignSlug)) {
            result.push({
                name: item.name.replace(/\.(md|txt)$/, ''),
                path: normalizedRelPath,
                isDirectory: false,
            });
        }
    }

    return result.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');
    const campaignSlug = normalizeCampaignSlug(searchParams.get('campaign'));

    const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

    if (filePath) {
        const normalizedPath = toPosixPath(path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, ''));
        const fullPath = path.join(contentDir, normalizedPath);

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (!isVisiblePath(normalizedPath, campaignSlug)) {
            return NextResponse.json({ error: 'File not available in this campaign' }, { status: 403 });
        }

        try {
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                return NextResponse.json({ content });
            }
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        } catch (error) {
            console.error('Error reading file:', error);
            return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
        }
    }

    try {
        const tree = getFilesTree(contentDir, campaignSlug);
        return NextResponse.json({ tree });
    } catch (error) {
        console.error('Error generating file tree:', error);
        return NextResponse.json({ error: 'Failed to generate file tree' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const campaignSlug = normalizeCampaignSlug(searchParams.get('campaign'));
        const { name, content, path: targetPath } = await request.json();
        const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

        if (!name || !content) {
            return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
        }

        const fileName = name.endsWith('.md') ? name : `${name}.md`;
        const normalizedRelPath = targetPath ? toPosixPath(path.normalize(targetPath).replace(/^(\.\.(\/|\\|$))+/, '')) : '';
        const fullDirPath = path.join(contentDir, normalizedRelPath);
        const fullPath = path.join(fullDirPath, fileName);
        const relativePathForSync = toPosixPath(path.join(normalizedRelPath, fileName));

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (!isVisiblePath(relativePathForSync, campaignSlug)) {
            return NextResponse.json({ error: 'File not available in this campaign' }, { status: 403 });
        }

        if (!fs.existsSync(fullDirPath)) {
            fs.mkdirSync(fullDirPath, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');

        try {
            await reindexFile(relativePathForSync, content);
        } catch (reindexErr) {
            console.error('Re-indexing failed after POST:', reindexErr);
        }

        return NextResponse.json({ success: true, path: relativePathForSync });
    } catch (error) {
        console.error('Error creating file:', error);
        return NextResponse.json({ error: 'Failed to create file' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get('path');
        const campaignSlug = normalizeCampaignSlug(searchParams.get('campaign'));
        const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

        if (!filePath) {
            return NextResponse.json({ error: 'Path is required' }, { status: 400 });
        }

        const normalizedPath = toPosixPath(path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, ''));
        const fullPath = path.join(contentDir, normalizedPath);

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (!isVisiblePath(normalizedPath, campaignSlug)) {
            return NextResponse.json({ error: 'File not available in this campaign' }, { status: 403 });
        }

        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                return NextResponse.json({ error: 'Deleting directories is not allowed for safety' }, { status: 400 });
            }
            fs.unlinkSync(fullPath);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'File not found' }, { status: 404 });
    } catch (error) {
        console.error('Error deleting file:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const campaignSlug = normalizeCampaignSlug(searchParams.get('campaign'));
        const { path: filePath, content } = await request.json();
        const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

        if (!filePath || content === undefined) {
            return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
        }

        const normalizedPath = toPosixPath(path.normalize(filePath).replace(/^(\.\.((\/|\\)|$))+/, ''));
        const fullPath = path.join(contentDir, normalizedPath);

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (!isVisiblePath(normalizedPath, campaignSlug)) {
            return NextResponse.json({ error: 'File not available in this campaign' }, { status: 403 });
        }

        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');

        try {
            await reindexFile(normalizedPath, content);
        } catch (reindexErr) {
            console.error('Re-indexing failed after PUT:', reindexErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating file:', error);
        return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const campaignSlug = normalizeCampaignSlug(searchParams.get('campaign'));
        const body = await request.json();
        const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

        if (body.action === 'create-folder') {
            const { folderPath } = body;
            if (!folderPath) {
                return NextResponse.json({ error: 'folderPath is required' }, { status: 400 });
            }
            const normalizedPath = toPosixPath(path.normalize(folderPath).replace(/^(\.\.((\/|\\)|$))+/, ''));
            const fullPath = path.join(contentDir, normalizedPath);

            if (!fullPath.startsWith(contentDir)) {
                return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
            }

            if (fs.existsSync(fullPath)) {
                return NextResponse.json({ error: 'La cartella esiste già' }, { status: 409 });
            }

            fs.mkdirSync(fullPath, { recursive: true });
            return NextResponse.json({ success: true });
        }

        const { from, to } = body;
        if (!from || to === undefined) {
            return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
        }

        const normalizedFrom = toPosixPath(path.normalize(from).replace(/^(\.\.((\/|\\)|$))+/, ''));
        const normalizedTo = toPosixPath(path.normalize(to).replace(/^(\.\.((\/|\\)|$))+/, ''));
        const fullFrom = path.join(contentDir, normalizedFrom);

        const fileName = path.basename(normalizedFrom);
        const destDir = normalizedTo ? path.join(contentDir, normalizedTo) : contentDir;
        const fullTo = path.join(destDir, fileName);
        const normalizedDestination = toPosixPath(path.relative(contentDir, fullTo));

        if (!fullFrom.startsWith(contentDir) || !fullTo.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (!isVisiblePath(normalizedFrom, campaignSlug) || !isVisiblePath(normalizedDestination, campaignSlug)) {
            return NextResponse.json({ error: 'File not available in this campaign' }, { status: 403 });
        }

        if (!fs.existsSync(fullFrom)) {
            return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }

        if (fs.existsSync(fullTo)) {
            return NextResponse.json({ error: 'Un file con lo stesso nome esiste già nella destinazione' }, { status: 409 });
        }

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        fs.renameSync(fullFrom, fullTo);

        const stats = fs.statSync(fullTo);
        if (!stats.isDirectory() && (fullTo.endsWith('.md') || fullTo.endsWith('.txt'))) {
            try {
                const newContent = fs.readFileSync(fullTo, 'utf-8');
                await reindexFile(normalizedDestination, newContent);
            } catch (reindexErr) {
                console.error('Re-indexing failed after move:', reindexErr);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH:', error);
        return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
    }
}
