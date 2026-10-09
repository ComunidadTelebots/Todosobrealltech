"""
Token Manager - Cifrado/descifrado seguro de tokens de bots
Usa Fernet (AES) para encriptación simétrica de tokens
"""

import os
import json
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv()

class TokenManager:
    def __init__(self):
        """Inicializa el manager con clave de encriptación del .env"""
        self.cipher_key = os.getenv("CIPHER_KEY")

        # Si no existe clave, generar nueva y mostrar advertencia
        if not self.cipher_key:
            self.cipher_key = Fernet.generate_key().decode()
            print("\n" + "="*60)
            print("⚠️  PRIMERA EJECUCIÓN: NUEVA CLAVE DE CIFRADO GENERADA")
            print("="*60)
            print(f"CIPHER_KEY={self.cipher_key}")
            print("Añade esto a tu archivo .env para futuros usos")
            print("="*60 + "\n")

        self.cipher = Fernet(self.cipher_key.encode() if isinstance(self.cipher_key, str) else self.cipher_key)

    def encrypt_token(self, token: str) -> str:
        """Encripta un token y lo retorna como string"""
        encrypted = self.cipher.encrypt(token.encode())
        return encrypted.decode()

    def decrypt_token(self, encrypted_token: str) -> str:
        """Desencripta un token encriptado"""
        try:
            decrypted = self.cipher.decrypt(encrypted_token.encode())
            return decrypted.decode()
        except InvalidToken:
            raise ValueError("Token encriptado inválido o clave de cifrado incorrecta")

    def load_bots_from_file(self, file_path: str = "data/bots.json", encrypted: bool = False) -> list:
        """
        Carga bots desde archivo JSON

        Args:
            file_path: ruta del archivo
            encrypted: Si True, desencripta los tokens; Si False, asume plain text

        Returns:
            Lista de dicts con {token, name, enabled}
        """
        if not os.path.exists(file_path):
            return []

        with open(file_path, 'r') as f:
            bots = json.load(f)

        if encrypted:
            for bot in bots:
                if "token" in bot and bot.get("encrypted", False):
                    try:
                        bot["token"] = self.decrypt_token(bot["token"])
                        bot["encrypted"] = False
                    except Exception as e:
                        print(f"Error desencriptando token de bot: {e}")

        return bots

    def save_bots_to_file(self, bots: list, file_path: str = "data/bots.json", encrypt: bool = True):
        """
        Guarda bots en archivo JSON, opcionalmente encriptados

        Args:
            bots: Lista de dicts con bots
            file_path: ruta del archivo
            encrypt: Si True, encripta los tokens
        """
        os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)

        bots_to_save = []
        for bot in bots:
            bot_copy = bot.copy()
            if encrypt and "token" in bot_copy:
                bot_copy["token"] = self.encrypt_token(bot_copy["token"])
                bot_copy["encrypted"] = True
            bots_to_save.append(bot_copy)

        with open(file_path, 'w') as f:
            json.dump(bots_to_save, f, indent=4)

    def migrate_bots_to_encrypted(self, input_file: str = "data/bots.json", output_file: str = "data/bots.json"):
        """
        Migra bots de plain text a encriptados

        Args:
            input_file: archivo de origen (plain text)
            output_file: archivo de destino (encriptado)
        """
        print(f"Migrando bots de {input_file} a formato encriptado...")
        bots = self.load_bots_from_file(input_file, encrypted=False)

        if not bots:
            print("No se encontraron bots para migrar.")
            return

        self.save_bots_to_file(bots, output_file, encrypt=True)
        print(f"✅ {len(bots)} bots migrados correctamente a {output_file}")


# Instancia global
token_manager = TokenManager()
