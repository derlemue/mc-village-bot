class CommandHelper {
    constructor(bot) {
        this.bot = bot;
    }

    /**
     * Fills a region with a block, automatically splitting into chunks if > 32768 blocks.
     * IMPROVED: Uses iterative approach (stack) to prevent Maximum Call Stack Size Exceeded errors.
     * SECURED: Input validation and loop limits to prevent Infinite Loop / OOM.
     */
    async fill(x1, y1, z1, x2, y2, z2, block) {
        // Validation: Check for non-finite numbers (NaN, Infinity)
        if (![x1, y1, z1, x2, y2, z2].every(Number.isFinite)) {
            console.error(`[CommandHelper] ❌ ERROR: Invalid coordinates passed to fill: ${x1},${y1},${z1} -> ${x2},${y2},${z2}`);
            return;
        }

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
        let iterations = 0;
        const MAX_ITERATIONS = 100000; // Safety brake

        while (stack.length > 0) {
            iterations++;
            if (iterations > MAX_ITERATIONS) {
                console.error(`[CommandHelper] 🛑 EMERGENCY STOP: Exceeded ${MAX_ITERATIONS} iterations in fill loop. Possible infinite split.`);
                break;
            }

            const region = stack.pop();
            const { minX, maxX, minY, maxY, minZ, maxZ } = region;

            // Integrity check for corrupted regions
            if (minX > maxX || minY > maxY || minZ > maxZ) continue;

            const width = maxX - minX + 1;
            const height = maxY - minY + 1;
            const depth = maxZ - minZ + 1;

            const volume = width * height * depth;

            // Minecraft limit is 32768 blocks
            // Note: If dimensions are large but result in valid volume, we execute.
            if (volume <= 32700) {
                //  console.log(`[CommandHelper] ⚡ /fill ${minX},${minY},${minZ} -> ${maxX},${maxY},${maxZ} (${volume} blocks)`);
                this.bot.chat(`/fill ${minX} ${minY} ${minZ} ${maxX} ${maxY} ${maxZ} ${block}`);
                await new Promise(r => setTimeout(r, 250));
                continue;
            }

            // Split logic: Always split the largest dimension
            // If we are here, volume > 32700. This implies at least one dimension is > 1.
            // (If all were 1, volume would be 1, which is <= 32700)

            if (width >= height && width >= depth) {
                // Split X
                const midX = Math.floor((minX + maxX) / 2);

                // Prevent infinite split if range is too small to split? 
                // If minX == midX, we might have an issue if width > 1?
                // If width >= 2, minX != maxX. midX will be strictly < maxX.
                // midX might be equal to minX (if width=2, range 0-1, mid 0).
                // Left: minX..midX (0..0) size 1. Right: midX+1..maxX (1..1) size 1.
                // So split works for width >= 2.

                stack.push({
                    minX: midX + 1, maxX: maxX, minY, maxY, minZ, maxZ
                });
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
