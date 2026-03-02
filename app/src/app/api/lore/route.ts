import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
