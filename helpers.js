// ── HELPERS ────────────────────────────────────────────────────────────────────
async function stockMovimiento(client, producto_id, tipo, cantidad, motivo, referencia_doc, fecha) {
  const delta = tipo === 'entrada' ? +cantidad : -Math.abs(+cantidad);
  await client.query(
    `INSERT INTO movimientos_stock (producto_id,tipo,cantidad,motivo,referencia_doc,fecha) VALUES ($1,$2,$3,$4,$5,$6)`,
    [producto_id, tipo, Math.abs(+cantidad), motivo, referencia_doc||null, fecha||new Date().toISOString().slice(0,10)]
  );
  await client.query(
    `UPDATE stock SET cantidad=GREATEST(0,cantidad+$1), updated_at=NOW() WHERE producto_id=$2`,
    [delta, producto_id]
  );
}

module.exports = { stockMovimiento };
