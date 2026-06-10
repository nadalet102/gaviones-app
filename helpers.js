// ── HELPERS ────────────────────────────────────────────────────────────────────
async function stockMovimiento(client, producto_id, tipo, cantidad, motivo, referencia_doc, fecha) {
  const n = +cantidad;
  // delta = cambio (con signo) que se aplica al stock.
  // tipoNorm = cómo se guarda en el libro: SIEMPRE 'entrada' o 'salida', nunca
  //   'ajuste', para que el recálculo (Σ entradas − Σ salidas) siga cuadrando.
  // 'ajuste' = ajuste con signo: positivo suma, negativo resta.
  let delta, tipoNorm;
  if (tipo === 'ajuste') { delta = n; tipoNorm = n >= 0 ? 'entrada' : 'salida'; }
  else if (tipo === 'entrada') { delta = Math.abs(n); tipoNorm = 'entrada'; }
  else { delta = -Math.abs(n); tipoNorm = 'salida'; }
  await client.query(
    `INSERT INTO movimientos_stock (producto_id,tipo,cantidad,motivo,referencia_doc,fecha) VALUES ($1,$2,$3,$4,$5,$6)`,
    [producto_id, tipoNorm, Math.abs(delta), motivo, referencia_doc||null, fecha||new Date().toISOString().slice(0,10)]
  );
  // Sin tope a 0: el stock puede quedar negativo (señal de que se ha entregado
  // más de lo fabricado). Así cada salida/entrada es exactamente reversible y
  // no se pierden unidades ni aparece stock fantasma al anular.
  await client.query(
    `UPDATE stock SET cantidad=cantidad+$1, updated_at=NOW() WHERE producto_id=$2`,
    [delta, producto_id]
  );
}

module.exports = { stockMovimiento };
