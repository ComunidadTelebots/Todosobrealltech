from moon_multibot import db
audits = db.get('ACTIVE_AUDITS', {})
cid = '-1001011068655'
if cid in audits:
    del audits[cid]
    db.set('ACTIVE_AUDITS', audits)
    print(f'Auditoria de {cid} eliminada.')
else:
    print(f'No se encontró auditoría para {cid}.')
