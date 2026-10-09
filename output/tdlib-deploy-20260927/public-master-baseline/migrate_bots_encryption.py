#!/usr/bin/env python3
"""
Script de migración: Convierte bots.json de plain text a encriptado
Ejecutar: python migrate_bots_encryption.py
"""

import os
import sys
from token_manager import token_manager

def main():
    print("\n" + "="*60)
    print("🔐 MIGRACIÓN: Bots Plain Text → Encriptado")
    print("="*60 + "\n")

    bots_file = "data/bots.json"
    backup_file = "data/bots.json.backup"

    # Verificar si archivo existe
    if not os.path.exists(bots_file):
        print(f"❌ Archivo {bots_file} no encontrado.")
        return

    # Crear backup
    import shutil
    shutil.copy(bots_file, backup_file)
    print(f"✅ Backup creado: {backup_file}\n")

    # Migrar
    try:
        token_manager.migrate_bots_to_encrypted(bots_file, bots_file)
        print("\n" + "="*60)
        print("✅ MIGRACIÓN COMPLETADA")
        print("="*60)
        print(f"\n📌 Importante:")
        print(f"   1. Guarda tu CIPHER_KEY en un lugar seguro")
        print(f"   2. Añádela a tu archivo .env")
        print(f"   3. Verifica que moon_multibot.py cargue correctamente")
        print(f"\n💾 Backup disponible en: {backup_file}")
        print("="*60 + "\n")
    except Exception as e:
        print(f"❌ Error durante migración: {e}")
        print(f"Restaurando desde backup...")
        shutil.copy(backup_file, bots_file)

if __name__ == "__main__":
    main()
