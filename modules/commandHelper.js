class CommandHelper {
    constructor(bot) {
        this.bot = bot;
    }

    /**
     * Fills a region with a block, automatically splitting into chunks if > 32768 blocks.
     * IMPROVED: Uses iterative approach (stack) to prevent Maximum Call Stack Size Exceeded errors.
     */
    async fill(x1, y1, z1, x2, y2, z2, block) {
        // Quantize coordinates to integers immediately
        const startRegion = {
            minX: Math.floor(Math.min(x1, x2)),
            maxX: Math.floor(Math.max(x1, x2)),
            minY: Math.floor(Math.min(y1, y2)),
            maxY: Math.floor(Math.max(y1, y2)),
            minZ: Math.floor(Math.min(z1, z2)),
            maxZ: Math.floor(Math.max(z1, z2))
        };

        const stack = [startRegion];

        while (stack.length > 0) {
            const region = stack.pop();
            const { minX, maxX, minY, maxY, minZ, maxZ } = region;

            // Integrity check for corrupted regions
            if (minX > maxX || minY > maxY || minZ > maxZ) continue;

            const width = maxX - minX + 1;
            const height = maxY - minY + 1;
            const depth = maxZ - minZ + 1;

            // Base case: Safety against extremely dense infinite loops
            // If any dimension is 0 or less (should be caught by continue above), skip.
            // If volume is processed
            const volume = width * height * depth;

            // Minecraft limit is 32768 blocks
            if (volume <= 32700) {
                console.log(`[CommandHelper] ⚡ /fill ${minX},${minY},${minZ} -> ${maxX},${maxY},${maxZ} (${volume} blocks)`);
                this.bot.chat(`/fill ${minX} ${minY} ${minZ} ${maxX} ${maxY} ${maxZ} ${block}`);
                await new Promise(r => setTimeout(r, 50));
                continue;
            }

            // Split logic: Always split the largest dimension that is > 1
            // If all dimensions are 1, volume is 1, so it would have been caught above.

            if (width >= height && width >= depth) {
                // Split X
                const midX = Math.floor((minX + maxX) / 2);
                // Push right part first (processed last)
                stack.push({
                    minX: midX + 1, maxX: maxX, minY, maxY, minZ, maxZ
                });
                // Push left part second (processed first)
                stack.push({
                    minX: minX, maxX: midX, minY, maxY, minZ, maxZ
                });
            } else if (height >= width && height >= depth) {
                // Split Y
                const midY = Math.floor((minY + maxY) / 2);
                stack.push({
                    minX, maxX, minY: midY + 1, maxY: maxY, minZ, maxZ
                });
                stack.push({
                    minX, maxX, minY: minY, maxY: midY, minZ, maxZ
                });
            } else {
                // Split Z
                const midZ = Math.floor((minZ + maxZ) / 2);
                stack.push({
                    minX, maxX, minY, maxY, minZ: midZ + 1, maxZ: maxZ
                });
                stack.push({
                    minX, maxX, minY, maxY, minZ: minZ, maxZ: midZ
                });
            }
        }
    }

    async fillReplace(x1, y1, z1, x2, y2, z2, block, replaceBlock) {
        console.log(`⚠️ fillReplace not fully implemented with chunking yet.`);
    }
}

module.exports = CommandHelper;
