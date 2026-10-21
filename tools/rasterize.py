#!/usr/bin/env python3
"""Rasterise a recorded frame (frame_*.json) into a PNG so it can be viewed."""
import json, sys, glob, os
from PIL import Image, ImageDraw, ImageFont

MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
MONOB = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'


def font(size, bold):
    p = MONOB if bold else MONO
    try:
        return ImageFont.truetype(p, max(4, int(round(size))))
    except Exception:
        return ImageFont.load_default()


def mmul(m, n):
    return (m[0]*n[0] + m[2]*n[1], m[1]*n[0] + m[3]*n[1],
            m[0]*n[2] + m[2]*n[3], m[1]*n[2] + m[3]*n[3],
            m[0]*n[4] + m[2]*n[5] + m[4], m[1]*n[4] + m[3]*n[5] + m[5])


def mapply(m, x, y):
    return (m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5])


def draw_op(dr, op, m):
    c = op.get('c', [128, 128, 128, 1])
    a = float(op.get('a', 1)) * (c[3] if len(c) > 3 else 1)
    if a <= 0.004:
        return
    col = (int(c[0]), int(c[1]), int(c[2]), int(max(0.0, min(1.0, a)) * 255))
    if op['t'] == 'poly':
        pts = [mapply(m, p[0], p[1]) for p in op['pts']]
        if len(pts) < 3:
            return
        if op.get('s'):
            lw = max(1, int(op.get('lw', 1)))
            try:
                dr.line(pts + [pts[0]], fill=col, width=lw, joint='curve')
            except Exception:
                dr.line(pts + [pts[0]], fill=col, width=lw)
        else:
            dr.polygon(pts, fill=col)
    elif op['t'] == 'text':
        s = op['s']
        if not s.strip():
            return
        x, y = mapply(m, op['x'], op['y'])
        scale = (m[1] ** 2 + m[3] ** 2) ** 0.5 or 1.0
        f = font(op['size'] * scale, op.get('bold'))
        anchor = {'left': 'ls', 'center': 'ms', 'right': 'rs'}.get(op.get('align', 'left'), 'ls')
        try:
            dr.text((x, y), s, font=f, fill=col, anchor=anchor)
        except Exception:
            dr.text((x, y), s, font=f, fill=col)


def draw_ops(dr, ops, buffers, m, depth=0):
    if depth > 4:
        return
    for op in ops:
        if op['t'] == 'group':
            if op['id'] not in buffers:
                continue
            # child ops carry absolute device coords, so the group's own
            # recorded matrix is what maps user space -> device space
            gm = tuple(op.get('m') or (1, 0, 0, 1, 0, 0))
            local = mmul(gm, (op['dw'] / max(1, op['sw']), 0, 0,
                              op['dh'] / max(1, op['sh']), op['dx'], op['dy']))
            # compose with the enclosing transform: nested sprites live inside
            # their parent canvas's space, so the parent matrix still applies
            sub = mmul(m, local)
            draw_ops(dr, buffers[op['id']], buffers, sub, depth + 1)
        else:
            draw_op(dr, op, m)


def render(path, out):
    data = json.load(open(path))
    W, H = int(data['w']), int(data['h'])
    img = Image.new('RGB', (W, H), (0, 0, 0))
    dr = ImageDraw.Draw(img, 'RGBA')
    bufs = {}
    for k, v in (data.get('buffers') or {}).items():
        try: bufs[int(k)] = v
        except Exception: bufs[k] = v
    draw_ops(dr, data['ops'], bufs, (1, 0, 0, 1, 0, 0))
    img.save(out)
    return W, H, len(data['ops'])


if __name__ == '__main__':
    targets = sys.argv[1:] or [os.path.basename(p)[6:-5] for p in glob.glob('/scratch/work/frame_*.json')]
    for t in targets:
        p = '/scratch/work/frame_%s.json' % t
        if not os.path.exists(p):
            print('missing', p); continue
        W, H, n = render(p, '/scratch/work/shot_%s.png' % t)
        print('shot_%s.png  %dx%d  from %d ops' % (t, W, H, n))
