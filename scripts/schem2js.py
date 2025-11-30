#!/usr/bin/env python3
"""
WorldEdit .schem → Bot .js - FIX: Find CORRECT BlockData AFTER Blocks tag
"""

import struct
import os
import argparse
import zlib
from pathlib import Path
from collections import Counter

class SchemConverter:
    """Konvertiert .schem → Bot .js"""
    
    def __init__(self, verbose=False):
        self.verbose = verbose
    
    def log(self, msg):
        if self.verbose:
            print(msg)
    
    def read_schem(self, filename):
        """Liest .schem"""
        print(f"📖 Lese {filename}")
        
        with open(filename, 'rb') as f:
            raw_data = f.read()
        
        print(f"   📊 Größe: {len(raw_data)} Bytes")
        
        # GZIP Decompression
        data = raw_data
        try:
            decompressor = zlib.decompressobj(16 + zlib.MAX_WBITS)
            data = decompressor.decompress(raw_data)
            print(f"   ✅ GZIP: {len(raw_data)} → {len(data)} Bytes")
        except:
            print("   ℹ️ Nicht GZIP")
            data = raw_data
        
        # Extract Palette
        palette = self._extract_palette_nbt(data)
        print(f"   🎨 Palette: {len(palette)} Einträge")
        if self.verbose and palette:
            for i, name in sorted(list(palette.items())[:10]):
                self.log(f"      [{i}] {name}")
        
        # Finde Dimensionen
        width, height, length = self._find_dimensions(data)
        if width <= 0 or height <= 0 or length <= 0:
            raise ValueError(f"Dimensionen nicht gefunden!")
        
        print(f"   📐 Dimensionen: {width}x{height}x{length}")
        
        # Extrahiere BlockData - NACH Palette!
        block_data = self._extract_block_data_after_palette(data)
        
        # Dekodiere Blöcke
        blocks = self._decode_blocks(block_data, palette, width, height, length)
        print(f"   ✅ {len(blocks)} Blöcke dekodiert")
        
        return width, height, length, blocks
    
    def _extract_palette_nbt(self, data):
        """Extrahiert Palette - Tag-Namen sind Block-Namen!"""
        palette = {}
        
        # Suche nach "Palette" Tag
        palette_pos = data.find(b'Palette')
        if palette_pos == -1:
            self.log("   ⚠️ Palette Tag nicht gefunden")
            return palette
        
        # Suche nach TAG_Compound (0x0A) vor Palette-Namen
        palette_start = -1
        for i in range(max(0, palette_pos - 50), palette_pos + 10):
            if data[i:i+1] == b'\x0a':
                try:
                    name_len = struct.unpack('>H', data[i+1:i+3])[0]
                    if name_len == 7 and data[i+3:i+10] == b'Palette':
                        palette_start = i + 10  # Nach "Palette" Name
                        break
                except:
                    pass
        
        if palette_start == -1:
            self.log("   ⚠️ Palette Compound nicht gefunden")
            return palette
        
        # Parse Palette Compound: TAG_Type + Name-Len + Name (=BlockName) + Value
        pos = palette_start
        while pos < len(data):
            tag_type = data[pos:pos+1]
            
            if not tag_type or tag_type == b'\x00':
                break
            
            pos += 1
            
            # Read tag name (= Block Name)
            if pos + 2 >= len(data):
                break
            
            name_len = struct.unpack('>H', data[pos:pos+2])[0]
            pos += 2
            
            if pos + name_len > len(data):
                break
            
            block_name = data[pos:pos+name_len].decode('utf-8', errors='ignore')
            pos += name_len
            
            tag_type_int = tag_type[0]
            
            # TAG_Int (0x03) - Index value
            if tag_type_int == 0x03:
                if pos + 4 >= len(data):
                    break
                
                idx = struct.unpack('>I', data[pos:pos+4])[0]
                pos += 4
                
                # Extract "minecraft:block_name" → "block_name"
                if ':' in block_name:
                    block_name = block_name.split(':')[-1]
                
                # Remove properties like "[level=0]"
                if '[' in block_name:
                    block_name = block_name.split('[')[0]
                
                palette[idx] = block_name
                self.log(f"      [{idx}] {block_name}")
            
            # Skip other types
            elif tag_type_int == 0x01:  # TAG_Byte
                pos += 1
            elif tag_type_int == 0x02:  # TAG_Short
                pos += 2
            elif tag_type_int == 0x04:  # TAG_Long
                pos += 8
            elif tag_type_int == 0x05:  # TAG_Float
                pos += 4
            elif tag_type_int == 0x06:  # TAG_Double
                pos += 8
            elif tag_type_int == 0x08:  # TAG_String
                if pos + 2 < len(data):
                    str_len = struct.unpack('>H', data[pos:pos+2])[0]
                    pos += 2 + str_len
            elif tag_type_int == 0x07:  # TAG_ByteArray
                if pos + 4 < len(data):
                    array_len = struct.unpack('>I', data[pos:pos+4])[0]
                    pos += 4 + array_len
            elif tag_type_int == 0x0B:  # TAG_IntArray
                if pos + 4 < len(data):
                    array_len = struct.unpack('>I', data[pos:pos+4])[0]
                    pos += 4 + (array_len * 4)
            elif tag_type_int == 0x0C:  # TAG_LongArray
                if pos + 4 < len(data):
                    array_len = struct.unpack('>I', data[pos:pos+4])[0]
                    pos += 4 + (array_len * 8)
            elif tag_type_int == 0x09:  # TAG_List
                if pos + 5 < len(data):
                    pos += 1  # list type
                    list_len = struct.unpack('>I', data[pos:pos+4])[0]
                    pos += 4 + min(list_len * 50, 10000)
            elif tag_type_int == 0x0A:  # TAG_Compound
                # Skip nested
                depth = 1
                while depth > 0 and pos < len(data):
                    if data[pos:pos+1] == b'\x0a':
                        depth += 1
                    elif data[pos:pos+1] == b'\x00':
                        depth -= 1
                    pos += 1
        
        return palette
    
    def _extract_block_data_after_palette(self, data):
        """Extrahiert BlockData NACH Palette (nicht davor!)"""
        # Finde Palette Ende
        palette_pos = data.find(b'Palette')
        if palette_pos == -1:
            return None
        
        # Suche danach nach "BlockData" oder "Blocks"
        search_start = palette_pos + 7  # Nach "Palette"
        
        for tag_name in [b'BlockData', b'Blocks', b'Data']:
            pos = data.find(tag_name, search_start)
            if pos == -1:
                continue
            
            self.log(f"   Found {tag_name} at {pos}")
            
            # Suche nach TAG_ByteArray (0x07) DIREKT NACH tag name
            # Format: [TAG_Type:1] [Name-Len:2] [Name:N] [Value]
            # Für ByteArray: VALUE = [Array-Len:4] [Data:N]
            
            # Skip back to find the TAG type
            for i in range(max(0, pos - 100), pos + 20):
                if data[i:i+1] == b'\x07':
                    # Check if this is followed by the right name
                    try:
                        name_len = struct.unpack('>H', data[i+1:i+3])[0]
                        if name_len > 0 and name_len < 20:
                            tag_name_at_i = data[i+3:i+3+name_len]
                            
                            # Check if it matches one of our targets
                            if tag_name_at_i in [b'BlockData', b'Blocks', b'Data']:
                                # Found correct TAG_ByteArray!
                                array_len_pos = i + 1 + 2 + name_len
                                if array_len_pos + 4 < len(data):
                                    array_len = struct.unpack('>I', data[array_len_pos:array_len_pos+4])[0]
                                    
                                    # Plausibilität checken
                                    if 10000 < array_len < 500000:
                                        block_data_start = array_len_pos + 4
                                        block_data = data[block_data_start:block_data_start+array_len]
                                        self.log(f"      ✅ Found BlockData: {array_len} Bytes")
                                        return block_data
                    except:
                        pass
        
        return None
    
    def _find_dimensions(self, data):
        """Sucht Dimensionen"""
        width, height, length = 0, 0, 0
        
        for tag_name in ['Width', 'Height', 'Length']:
            pos = data.find(tag_name.encode('utf-8'))
            if pos == -1:
                continue
            
            for i in range(pos, min(pos + 20, len(data) - 2)):
                try:
                    val = struct.unpack('>h', data[i:i+2])[0]
                    if 1 <= val <= 500:
                        self.log(f"   {tag_name} = {val}")
                        if tag_name == 'Width':
                            width = val
                        elif tag_name == 'Height':
                            height = val
                        elif tag_name == 'Length':
                            length = val
                        break
                except:
                    pass
        
        return width, height, length
    
    def _decode_blocks(self, block_data, palette, width, height, length):
        """Dekodiert BlockData mit Palette"""
        total = width * height * length
        blocks = []
        
        if not block_data:
            return ['stone'] * total
        
        if not palette:
            self.log("   ⚠️ Palette leer")
            for i in range(min(len(block_data), total)):
                blocks.append(f'unknown_{block_data[i]}')
        else:
            for i in range(min(len(block_data), total)):
                idx = block_data[i]
                blocks.append(palette.get(idx, f'unknown_{idx}'))
        
        while len(blocks) < total:
            blocks.append('stone')
        
        return blocks[:total]
    
    def analyze_materials(self, blocks):
        """Analysiert Materialien"""
        counter = Counter(blocks)
        most_common = counter.most_common(30)
        
        if self.verbose:
            self.log("   🔹 Top 15 Blöcke:")
            for block, count in most_common[:15]:
                pct = (count / len(blocks)) * 100
                self.log(f"      {block}: {count:6d} ({pct:5.1f}%)")
        
        foundation = 'stone_bricks'
        for block, count in most_common:
            if block != 'air' and 'stairs' not in block and 'slab' not in block and 'door' not in block:
                if any(x in block for x in ['stone', 'brick', 'sand', 'deepslate']):
                    foundation = block
                    break
        
        walls = 'red_sandstone'
        for block, count in most_common:
            if any(x in block for x in ['wood', 'planks', 'brick', 'sandstone', 'glass']) and 'stairs' not in block:
                walls = block
                break
        
        roof = 'red_sandstone_stairs'
        for block, count in most_common:
            if 'stairs' in block:
                roof = block
                break
        
        return foundation, walls, roof
    
    def extract_details(self, blocks, width, height, length):
        """Extrahiert Details"""
        details = []
        special = {'door', 'lantern', 'torch', 'chest', 'furnace', 'bed', 'brewing', 'anvil', 'banner', 'sign', 'ladder'}
        
        for idx, block in enumerate(blocks):
            if any(x in block for x in special):
                z = idx // (width * height)
                y = (idx // width) % height
                x = idx % width
                
                details.append({
                    'x': int(x), 'y': int(y), 'z': int(z),
                    'block': block
                })
        
        print(f"   🔹 {len(details)} Details")
        return details[:50]
    
    def generate_js(self, name, width, height, length, foundation, walls, roof, details):
        """Generiert .js"""
        details_str = "["
        if details:
            details_str += "\n"
            for i, d in enumerate(details[:50]):
                details_str += f"\n  {{ x: {d['x']}, y: {d['y']}, z: {d['z']}, block: '{d['block']}' }}"
                if i < len(details) - 1:
                    details_str += ","
            details_str += "\n\n"
        details_str += "]"
        
        return f"""module.exports = {{

name: '{name}',

width: {width}, height: {height}, depth: {length},

foundation: '{foundation}', foundationHeight: 1,

walls: '{walls}',

roof: '{roof}',

doorPos: {{ x: {width // 2}, z: 0 }},

details: {details_str}

}};
"""
    
    def convert(self, input_file, output_file, name):
        """Konvertiert"""
        try:
            width, height, length, blocks = self.read_schem(input_file)
            
            print("🔍 Analysiere Materialien...")
            foundation, walls, roof = self.analyze_materials(blocks)
            
            details = self.extract_details(blocks, width, height, length)
            
            js = self.generate_js(name, width, height, length, foundation, walls, roof, details)
            
            os.makedirs(os.path.dirname(output_file) or '.', exist_ok=True)
            with open(output_file, 'w') as f:
                f.write(js)
            
            print(f"\n✅ KONVERTIERT!")
            print(f"   📥 {input_file}")
            print(f"   📤 {output_file}")
            print(f"   📐 {width}x{height}x{length}")
            print(f"   🧱 {foundation} | {walls} | {roof}")
            print(f"   🔹 {len(details)} Details")
            
            return True
        except Exception as e:
            print(f"❌ {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    parser = argparse.ArgumentParser(description='WorldEdit .schem → Bot .js')
    parser.add_argument('input', nargs='+')
    parser.add_argument('-o', '--output')
    parser.add_argument('-n', '--name')
    parser.add_argument('-v', '--verbose', action='store_true')
    
    args = parser.parse_args()
    converter = SchemConverter(verbose=args.verbose)
    
    for input_file in args.input:
        path = Path(input_file)
        if not path.exists():
            print(f"❌ {input_file}")
            continue
        
        name = args.name or path.stem
        output = args.output or path.with_suffix('.js')
        
        print(f"\n{'='*60}")
        converter.convert(str(path), str(output), name)

if __name__ == '__main__':
    main()
