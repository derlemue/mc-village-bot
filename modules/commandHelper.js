class CommandHelper {
    constructor(bot) {
        this.bot = bot;
    }

    /**
     * Fills a region with a block, automatically splitting into chunks if > 32768 blocks.
     * Uses recursive splitting to ensure all chunks are valid.
     */
    async fill(x1, y1, z1, x2, y2, z2, block) {
        // ✅ Ensure integers to prevent infinite recursion on float coordinates
        const minX = Math.floor(Math.min(x1, x2));
        const maxX = Math.floor(Math.max(x1, x2));
        const minY = Math.floor(Math.min(y1, y2));
        const maxY = Math.floor(Math.max(y1, y2));
        const minZ = Math.floor(Math.min(z1, z2));
        const maxZ = Math.floor(Math.max(z1, z2));

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const depth = maxZ - minZ + 1;
        const volume = width * height * depth;

        // Minecraft limit is 32768 blocks
        if (volume <= 32700) { // Safety margin
            console.log(`[CommandHelper] ⚡ /fill ${minX},${minY},${minZ} -> ${maxX},${maxY},${maxZ} (${volume} blocks)`);
            this.bot.chat(`/fill ${minX} ${minY} ${minZ} ${maxX} ${maxY} ${maxZ} ${block}`);
            await new Promise(r => setTimeout(r, 50)); // Short delay to prevent spam kick
            return;
        }

        // Safety check: If volume is huge but we can't split (dimensions are 1?), stop recursion
        if (width === 1 && height === 1 && depth === 1) {
            console.log(`[CommandHelper] ⚠️ Single block volume > 32700? Impossible state. ${volume}`);
            return;
        }

        // Split along the longest axis
        if (width >= height && width >= depth) {
            const midX = Math.floor((minX + maxX) / 2);
            // Ensure we actually split
            if (midX === maxX) {
                await this.fill(minX, minY, minZ, midX - 1, maxY, maxZ, block);
                await this.fill(midX, minY, minZ, maxX, maxY, maxZ, block);
            } else {
                await this.fill(minX, minY, minZ, midX, maxY, maxZ, block);
                await this.fill(midX + 1, minY, minZ, maxX, maxY, maxZ, block);
            }
        } else if (height >= width && height >= depth) {
            const midY = Math.floor((minY + maxY) / 2);
            if (midY === maxY) {
                await this.fill(minX, minY, minZ, maxX, midY - 1, maxZ, block);
                await this.fill(minX, midY, minZ, maxX, maxY, maxZ, block);
            } else {
                await this.fill(minX, minY, minZ, maxX, midY, maxZ, block);
                await this.fill(minX, midY + 1, minZ, maxX, maxY, maxZ, block);
            }
        } else {
            const midZ = Math.floor((minZ + maxZ) / 2);
            if (midZ === maxZ) {
                await this.fill(minX, minY, minZ, maxX, maxY, midZ - 1, block);
                await this.fill(minX, minY, midZ, maxX, maxY, maxZ, block);
            } else {
                await this.fill(minX, minY, minZ, maxX, maxY, midZ, block);
                await this.fill(minX, minY, midZ + 1, maxX, maxY, maxZ, block);
            }
        }
    }

    /**
     * Optional: Fill with replace filter (e.g., replace air with stone)
     */
    async fillReplace(x1, y1, z1, x2, y2, z2, block, replaceBlock) {
        // Similar splitting logic would go here if needed, 
        // but simply calling the chat command with "replace" suffix works if volume is handled.
        // For now, simple fill is enough for the task.
        this.bot.chat(`⚠️ fillReplace not fully implemented with chunking yet.`);
    }
}

module.exports = CommandHelper;
