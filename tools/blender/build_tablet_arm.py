"""Blender headless script: wall-mount tablet support arm -> GLB.

Proportions taken from photo assets/images/products/parts_gallary/parts_image_wall.webp:
wall plate top-left, square-tube arm slanting down-right, cylindrical elbow joint,
second square-tube arm with telescoping round inner tube + lock lever,
ball joint and black tablet on a holder plate at the end.
Units: meters. Built Z-up; glTF exporter converts to Y-up.
"""
import bpy
import math
import os
from mathutils import Vector

# 実行: /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/build_tablet_arm.py
OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "..", "..", "assets", "images", "hero", "with_tablet.glb"))

# ---------- clean scene ----------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

# ---------- materials ----------
def make_mat(name, color, metallic, roughness):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = m.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        out = next(n for n in m.node_tree.nodes if n.type == "OUTPUT_MATERIAL")
        m.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return m

MAT_STEEL   = make_mat("stainless",      (0.75, 0.76, 0.78), 1.0, 0.35)
MAT_SHINY   = make_mat("inner_tube",     (0.82, 0.83, 0.85), 1.0, 0.15)
MAT_DARK    = make_mat("dark_metal",     (0.28, 0.28, 0.30), 1.0, 0.45)
MAT_TABLET  = make_mat("tablet_black",   (0.015, 0.015, 0.018), 0.0, 0.40)
MAT_SCREEN  = make_mat("tablet_screen",  (0.01, 0.01, 0.012), 0.0, 0.10)

def assign(obj, mat, smooth=False):
    obj.data.materials.append(mat)
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True

# ---------- primitive helpers ----------
def box(center, size, mat, rot=(0, 0, 0), name="box"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center, rotation=rot)
    o = bpy.context.object
    o.scale = size
    o.name = name
    assign(o, mat)
    return o

def seg(p1, p2, w, mat, kind="square", r=None, name="seg", pad=0.0):
    """Segment between two points. kind: square tube (w) or round (r)."""
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    length = d.length + pad * 2
    mid = (p1 + p2) / 2
    quat = d.to_track_quat("Z", "Y")
    if kind == "square":
        bpy.ops.mesh.primitive_cube_add(size=1, location=mid)
        o = bpy.context.object
        o.scale = (w, w, length)
    else:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=length, vertices=48, location=mid)
        o = bpy.context.object
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = quat
    o.name = name
    assign(o, mat, smooth=(kind != "square"))
    return o

def cyl(center, radius, depth, mat, axis="Y", name="cyl", vertices=48):
    rot = {"X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0), "Z": (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices,
                                        location=center, rotation=rot)
    o = bpy.context.object
    o.name = name
    assign(o, mat, smooth=True)
    return o

def ball(center, radius, mat, name="ball"):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=center,
                                         segments=32, ring_count=16)
    o = bpy.context.object
    o.name = name
    assign(o, mat, smooth=True)
    return o

# ---------- key points ----------
A  = Vector((0.055, 0.0, 1.50))   # hinge at wall bracket
E  = Vector((0.42,  0.0, 1.26))   # elbow joint
M  = Vector((0.68,  0.0, 0.86))   # telescope clamp (outer->inner tube)
B  = Vector((0.88,  0.0, 0.55))   # end of inner tube / ball joint

# ---------- wall plate + bolts + bracket ----------
box((0.006, 0, 1.50), (0.012, 0.11, 0.11), MAT_STEEL, name="wall_plate")
for dy in (-0.04, 0.04):
    for dz in (-0.04, 0.04):
        cyl((0.014, dy, 1.50 + dz), 0.006, 0.006, MAT_STEEL, axis="X", name="bolt", vertices=24)
box((0.032, 0, 1.50), (0.045, 0.045, 0.065), MAT_STEEL, name="bracket")
cyl(A, 0.016, 0.06, MAT_STEEL, name="hinge_pin")

# ---------- arm 1 (square tube) ----------
seg(A, E, 0.028, MAT_STEEL, name="arm1", pad=0.01)

# ---------- elbow joint ----------
cyl(E, 0.033, 0.058, MAT_STEEL, name="elbow")
cyl(E, 0.012, 0.075, MAT_DARK, name="elbow_axle")

# ---------- arm 2 outer (square tube) + clamp + lock lever ----------
seg(E, M, 0.028, MAT_STEEL, name="arm2_outer", pad=0.01)
d2 = (B - M).normalized()
clamp_c = M + d2 * 0.005
seg(clamp_c - d2 * 0.03, clamp_c + d2 * 0.03, 0.036, MAT_STEEL, name="clamp")
# small lock lever poking up from the clamp
lever_base = M + Vector((0.0, 0.0, 0.025))
seg(lever_base, lever_base + Vector((-0.015, 0.0, 0.045)), 0, MAT_DARK, kind="round", r=0.005, name="lever")
ball(lever_base + Vector((-0.015, 0.0, 0.045)), 0.009, MAT_DARK, name="lever_knob")

# ---------- telescoping inner tube (round, shinier) ----------
seg(M, B, 0, MAT_SHINY, kind="round", r=0.011, name="inner_tube", pad=0.005)

# ---------- ball joint + holder + tablet ----------
end_fitting = B + d2 * 0.012
seg(B - d2 * 0.01, end_fitting, 0, MAT_STEEL, kind="round", r=0.016, name="end_fitting")
ball_c = end_fitting + d2 * 0.022
ball(ball_c, 0.020, MAT_STEEL, name="ball_joint")

# tablet plane: tilted up toward viewer
rot = (math.radians(-38), math.radians(8), math.radians(6))
holder_c = ball_c + Vector((0.045, 0.0, -0.045))
box(holder_c, (0.13, 0.10, 0.010), MAT_DARK, rot=rot, name="holder_plate")
# neck between ball and holder
seg(ball_c, holder_c, 0, MAT_STEEL, kind="round", r=0.009, name="neck")
# tablet body slightly above holder plate (local +Z of the tilted plane)
import mathutils
n = mathutils.Euler(rot).to_matrix() @ Vector((0, 0, 1))
tab_c = holder_c + n * 0.011
box(tab_c, (0.185, 0.26, 0.009), MAT_TABLET, rot=rot, name="tablet")
scr_c = holder_c + n * 0.0165
box(scr_c, (0.170, 0.245, 0.001), MAT_SCREEN, rot=rot, name="screen")
# corner clips holding the tablet
ey = mathutils.Euler(rot).to_matrix() @ Vector((0, 1, 0))
ex = mathutils.Euler(rot).to_matrix() @ Vector((1, 0, 0))
for sy in (-1, 1):
    clip_c = holder_c + ey * (sy * 0.135) + n * 0.012
    box(clip_c, (0.05, 0.012, 0.020), MAT_DARK, rot=rot, name="clip")

# ---------- export ----------
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB")
print("EXPORTED", OUT)
