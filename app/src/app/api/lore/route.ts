import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { reindexFile } from '@/lib/lore-ingestion';

export const dynamic = 'force-dynamic';

export interface LoreFile {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: LoreFile[];
}

function getFilesTree(dir: string, baseDir: string = ''): LoreFile[] {
    const p = path.join(dir, baseDir);
    if (!fs.existsSync(p)) return [];

    const items = fs.readdirSync(p, { withFileTypes: true });
    const result: LoreFile[] = [];

    for (const item of items) {
        // Skip hidden files/directories
        if (item.name.startsWith('.')) continue;

        const relPath = path.join(baseDir, item.name);

        if (item.isDirectory()) {
            const children = getFilesTree(dir, relPath);
            // Only add directories that have useful content (or we can just show all)
            if (children.length > 0) {
                result.push({
                    name: item.name,
                    path: relPath,
                    isDirectory: true,
                    children,
                });
            }
        } else if (item.name.endsWith('.md') || item.name.endsWith('.txt')) {
            result.push({
                name: item.name.replace(/\.(md|txt)$/, ''),
                path: relPath,
                isDirectory: false,
            });
        }
    }

    // Sort: categories (directories) first, then files alphabetically
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

    // the Next.js app runs inside DED/app, so the campaign folder is at ../dnd-campaign
    const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

    if (filePath) {
        // Prevent path traversal
        const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = path.join(contentDir, normalizedPath);

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        try {
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                return NextResponse.json({ content });
            } else {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
        } catch (error) {
            console.error('Error reading file:', error);
            return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
        }
    }

    // If no path is provided, return the file tree
    try {
        const tree = getFilesTree(contentDir);
        return NextResponse.json({ tree });
    } catch (error) {
        console.error('Error generating file tree:', error);
        return NextResponse.json({ error: 'Failed to generate file tree' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, content, path: targetPath } = await request.json();
        const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

        // Basic validation
        if (!name || !content) {
            return NextResponse.json({ error: 'Name and content are required' }, { status: 400 });
        }

        const fileName = name.endsWith('.md') ? name : `${name}.md`;
        const normalizedRelPath = targetPath ? path.normalize(targetPath).replace(/^(\.\.(\/|\\|$))+/, '') : '';
        const fullDirPath = path.join(contentDir, normalizedRelPath);
        const fullPath = path.join(fullDirPath, fileName);

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (!fs.existsSync(fullDirPath)) {
            fs.mkdirSync(fullDirPath, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');

        // Automatic re-indexing for AI
        const relativePathForSync = path.join(normalizedRelPath, fileName);
        try {
            await reindexFile(relativePathForSync, content);
        } catch (reindexErr) {
            console.error('Re-indexing failed after POST:', reindexErr);
            // We don't fail the whole request because the file was saved
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
        const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

        if (!filePath) {
            return NextResponse.json({ error: 'Path is required' }, { status: 400 });
        }

        const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = path.join(contentDir, normalizedPath);

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                // For safety, only allow deleting files or handle directory deletion carefully
                // fs.rmSync(fullPath, { recursive: true, force: true });
                return NextResponse.json({ error: 'Deleting directories is not allowed for safety' }, { status: 400 });
            } else {
                fs.unlinkSync(fullPath);
            }
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { path: filePath, content } = await request.json();
        const contentDir = path.join(process.cwd(), '..', 'dnd-campaign');

        if (!filePath || content === undefined) {
            return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
        }

        const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
        const fullPath = path.join(contentDir, normalizedPath);

        if (!fullPath.startsWith(contentDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (!fs.existsSync(fullPath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');

        // Automatic re-indexing for AI
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
