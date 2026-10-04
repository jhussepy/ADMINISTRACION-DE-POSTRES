import bpy, math, random
random.seed(47)

def image_material(name,size,pixel_fn):
    m=bpy.data.materials[name]
    img=bpy.data.images.new(name+' portable texture',width=size,height=size)
    pixels=[]
    for y in range(size):
        for x in range(size):pixels.extend((*pixel_fn(x/size,y/size),1))
    img.pixels.foreach_set(pixels);img.pack()
    nodes=m.node_tree.nodes;p=nodes.get('Principled BSDF')
    tex=nodes.new('ShaderNodeTexImage');tex.image=img
    m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    return img

def cut_pixel(u,v):
    x=(u-.5)*2
    core=math.exp(-((x/.25)**2+((v-.40)/.37)**2)*2.4)
    fibers=(.5+.5*math.sin(math.atan2(x,v+.18)*48+v*5))**12
    fibers*=max(0,1-abs(x))*.27
    pale=min(.93,core*.92+fibers)
    n=random.random()*.06
    return (.82+n,.075+n+pale*.73,.032+n+pale*.53)
image_material('Strawberry cut flesh',512,cut_pixel)
image_material('Blueberry bloom',256,lambda u,v:(.04+random.random()*.045,.049+random.random()*.045,.10+random.random()*.08))
image_material('Strawberry skin',256,lambda u,v:(.49+random.random()*.17,.012+random.random()*.025,.006+random.random()*.015))

for o in list(bpy.data.objects):
    if 'pale core' in o.name:bpy.data.objects.remove(o,do_unlink=True);continue
    if o.type!='MESH':continue
    if 'cut face' in o.name:
        uv=o.data.uv_layers.active
        for p in o.data.polygons:
            for li in p.loop_indices:
                co=o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(co.x/.05+.5,co.z/.046)
    if 'sponge' in o.name or 'centre' in o.name:
        for i,p in enumerate(o.data.polygons):p.use_smooth=(i%3==0 and i<len(o.data.polygons)-2)

# Fine relief survives export through a normal texture, using the standard GLTF
# normal-map node. The image represents tiny irregular sponge pores.
m=bpy.data.materials['Chocolate sponge — baked crumb'];nodes=m.node_tree.nodes;p=nodes.get('Principled BSDF')
img=bpy.data.images.new('Sponge pore normals',width=256,height=256);pixels=[]
for y in range(256):
    for x in range(256):pixels.extend((.5+random.uniform(-.17,.17),.5+random.uniform(-.17,.17),1,1))
img.pixels.foreach_set(pixels);img.colorspace_settings.name='Non-Color';img.pack()
tex=nodes.new('ShaderNodeTexImage');tex.image=img;normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.6
m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])

# Join each semantic part. This reduces hundreds of seed objects to three
# meshes, retaining the independent cake and slice and their material groups.
for name in ['Cake','Slice','Crumbs']:
    root=bpy.data.objects[name];meshes=[o for o in root.children_recursive if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
        o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join()
    joined=bpy.context.object;joined.name=name+'Geometry'
    world=joined.matrix_world.copy();joined.parent=root;joined.matrix_world=world
    for o in list(root.children_recursive):
        if o.type=='EMPTY':bpy.data.objects.remove(o,do_unlink=True)

scene=bpy.context.scene;scene.render.resolution_x=800;scene.render.resolution_y=800
scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG'
target=artifacts.file(name='yemape-dessert-refined.png',media_type='image/png');scene.render.filepath=target.path
bpy.ops.render.render(write_still=True);target.publish()
result={'meshes':len([o for o in bpy.data.objects if o.type=='MESH']), 'parts':['Cake','Slice','Crumbs']}
