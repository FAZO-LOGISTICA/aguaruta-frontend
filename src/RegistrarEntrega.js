# ============================================================================
# AGREGAR ESTO AL main.py v2.1 — después del endpoint POST /entregas-app
# ============================================================================

@app.post("/registrar-entregas")
async def registrar_entregas_con_foto(
    nombre: str = Form(...),
    camion: str = Form(...),
    litros: int = Form(...),
    estado: int = Form(...),       # 1=entregado, 2=sin moradores, 3=dir no existe, 4=camino malo
    fecha: str = Form(...),
    motivo: Optional[str] = Form(None),
    latitud: Optional[float] = Form(None),
    longitud: Optional[float] = Form(None),
    foto: Optional[UploadFile] = File(None)
):
    """
    Registrar entrega desde web o app móvil.
    Acepta multipart/form-data para poder recibir foto adjunta.
    Estados: 1=entregado | 2=sin moradores (foto) | 3=dir no existe | 4=camino malo (foto)
    """
    foto_path = None
    if foto and foto.filename:
        fname = f"{uuid.uuid4().hex}.jpg"
        dest = FOTOS_DIR / fname
        with dest.open("wb") as f:
            shutil.copyfileobj(foto.file, f)
        foto_path = f"/fotos/{fname}"
        log.info(f"[FOTO] Guardada: {foto_path}")

    nueva = {
        "id": int(datetime.now().timestamp()),
        "nombre": nombre,
        "camion": camion,
        "litros": litros if estado == 1 else 0,
        "estado": estado,
        "fecha": fecha,
        "motivo": motivo,
        "latitud": latitud,
        "longitud": longitud,
        "foto_url": foto_path,
        "fuente": "web",
        "registrado_en": datetime.utcnow().isoformat()
    }

    log.info(f"[ENTREGA] Registrada: camion={camion} nombre={nombre} estado={estado} fecha={fecha}")
    audit_log("sistema", "registrar_entrega", {"camion": camion, "nombre": nombre, "estado": estado})

    return {"status": "ok", "entrega": nueva}
