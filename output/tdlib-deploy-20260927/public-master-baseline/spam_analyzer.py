"""
Spam Pattern Analyzer - Analiza export.csv para detectar grupos comprometidos
Detecta: patrones numéricos, IDs consecutivas, anomalías
"""

import json
from collections import Counter, defaultdict
from datetime import datetime

class SpamPatternAnalyzer:
    """Analiza patrones sospechosos en IDs de grupos"""

    def __init__(self, csv_file: str = "export.csv"):
        self.csv_file = csv_file
        self.group_ids = []
        self.load_ids()

    def load_ids(self):
        """Carga IDs desde el archivo CSV"""
        with open(self.csv_file, 'r') as f:
            self.group_ids = [int(line.strip()) for line in f if line.strip()]
        print(f"✅ Cargados {len(self.group_ids):,} grupos")

    def detect_sequential_patterns(self, window: int = 10) -> list:
        """Detecta IDs consecutivas o muy cercanas (indicador de spam)"""
        patterns = []
        sorted_ids = sorted(self.group_ids)

        for i in range(len(sorted_ids) - window):
            window_ids = sorted_ids[i : i + window]
            diffs = [window_ids[j+1] - window_ids[j] for j in range(len(window_ids)-1)]

            # Si la mayoría de diferencias son < 100, es sospechoso
            avg_diff = sum(diffs) / len(diffs) if diffs else 0
            if avg_diff < 100 and avg_diff > 0:
                patterns.append({
                    "type": "sequential",
                    "start_id": window_ids[0],
                    "end_id": window_ids[-1],
                    "count": window,
                    "avg_diff": avg_diff
                })

        return patterns

    def detect_odd_patterns(self) -> dict:
        """Detecta patrones numéricos raros"""
        patterns = defaultdict(int)

        for gid in self.group_ids:
            gid_str = str(gid)

            # Patrón: todos los dígitos iguales (11111111)
            if len(set(gid_str)) == 1:
                patterns["all_same_digit"] += 1

            # Patrón: dígitos repetidos (1111, 2222)
            for digit in "0123456789":
                if gid_str.count(digit) >= 4:
                    patterns[f"repeated_{digit}_x4"] += 1
                    break

            # Patrón: números en secuencia (123456, 987654)
            for i in range(len(gid_str) - 2):
                seq = gid_str[i:i+3]
                if (int(seq[0]) + 1 == int(seq[1]) and int(seq[1]) + 1 == int(seq[2])) or \
                   (int(seq[0]) - 1 == int(seq[1]) and int(seq[1]) - 1 == int(seq[2])):
                    patterns["sequence_3plus"] += 1
                    break

        return dict(patterns)

    def detect_size_anomalies(self) -> dict:
        """Detecta anomalías en tamaño de IDs"""
        # IDs de Telegram típicos están en rango 9-10 dígitos
        id_lengths = Counter(len(str(gid)) for gid in self.group_ids)

        return {
            "length_distribution": dict(id_lengths),
            "unusual_lengths": [
                (length, count) for length, count in id_lengths.items()
                if length < 8 or length > 11
            ]
        }

    def get_range_stats(self) -> dict:
        """Obtiene estadísticas por rango de IDs"""
        ranges = defaultdict(int)
        for gid in self.group_ids:
            # Dividir en rangos de 100M
            range_key = (gid // 100_000_000) * 100_000_000
            ranges[range_key] += 1

        sorted_ranges = sorted(ranges.items())
        return {
            "total_ranges": len(sorted_ranges),
            "ranges": [
                {"start": r, "end": r + 100_000_000, "count": c}
                for r, c in sorted_ranges
            ]
        }

    def get_risk_score(self) -> dict:
        """Calcula score de riesgo general"""
        score = 0
        reasons = []

        # Checker 1: Patrones sequenciales
        seq_patterns = len(self.detect_sequential_patterns())
        if seq_patterns > 10:
            score += 30
            reasons.append(f"⚠️ {seq_patterns} patrones secuenciales detectados")

        # Checker 2: Patrones numéricos raros
        odd = self.detect_odd_patterns()
        if sum(odd.values()) > 100:
            score += 20
            reasons.append(f"⚠️ {sum(odd.values())} patrones numéricos raros")

        # Checker 3: Anomalías de tamaño
        anomalies = self.detect_size_anomalies()
        if anomalies["unusual_lengths"]:
            score += 10
            reasons.append(f"⚠️ IDs con tamaño inusual detectados")

        # Checker 4: Concentración en rangos (98% en 900M+)
        ranges = self.get_range_stats()
        if len(ranges["ranges"]) > 0:
            main_range_count = ranges["ranges"][-1]["count"]
            if main_range_count / len(self.group_ids) > 0.95:
                score += 5
                reasons.append("ℹ️ Alta concentración en rango 900M+ (normal para CAS)")

        return {
            "risk_score": min(score, 100),
            "reasons": reasons,
            "overall_verdict": (
                "🟢 BAJO RIESGO" if score < 30 else
                "🟡 RIESGO MODERADO" if score < 60 else
                "🔴 RIESGO ALTO"
            )
        }

    def generate_report(self) -> dict:
        """Genera reporte completo"""
        return {
            "timestamp": datetime.now().isoformat(),
            "total_groups": len(self.group_ids),
            "sequential_patterns": len(self.detect_sequential_patterns()),
            "odd_patterns": self.detect_odd_patterns(),
            "size_anomalies": self.detect_size_anomalies(),
            "range_statistics": self.get_range_stats(),
            "risk_assessment": self.get_risk_score(),
            "recommendations": self._get_recommendations()
        }

    def _get_recommendations(self) -> list:
        """Recomendaciones basadas en análisis"""
        recommendations = []

        if len(self.detect_sequential_patterns()) > 10:
            recommendations.append(
                "Considerar aumentar umbral de detección de spam para IDs en patrones secuenciales"
            )

        odd_count = sum(self.detect_odd_patterns().values())
        if odd_count > 100:
            recommendations.append(
                "Verificar si hay ataques de fuerza bruta con IDs generadas algorítmicamente"
            )

        return recommendations

    def export_report(self, output_file: str = "spam_analysis_report.json"):
        """Exporta reporte a archivo JSON"""
        report = self.generate_report()
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n✅ Reporte exportado a {output_file}")
        return report


def main():
    print("\n" + "="*60)
    print("🔍 ANÁLISIS DE PATRONES DE SPAM EN CAS.CHAT")
    print("="*60 + "\n")

    try:
        analyzer = SpamPatternAnalyzer("export.csv")

        # Generar reporte completo
        report = analyzer.generate_report()

        # Mostrar resumen
        print(f"📊 RESUMEN:")
        print(f"   Total de grupos: {report['total_groups']:,}")
        print(f"   Patrones secuenciales: {report['sequential_patterns']}")
        print(f"   Patrones numéricos raros: {sum(report['odd_patterns'].values())}")
        print(f"\n🎯 EVALUACIÓN DE RIESGO:")
        print(f"   Score: {report['risk_assessment']['risk_score']}/100")
        print(f"   Veredicto: {report['risk_assessment']['overall_verdict']}")

        print(f"\n📋 RAZONES:")
        for reason in report['risk_assessment']['reasons']:
            print(f"   {reason}")

        print(f"\n💡 RECOMENDACIONES:")
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"   {i}. {rec}")

        # Exportar
        analyzer.export_report()

        print("\n" + "="*60)

    except FileNotFoundError:
        print("❌ Archivo 'export.csv' no encontrado")
        print("   Descargalo con: curl -s https://api.cas.chat/export.csv > export.csv")


if __name__ == "__main__":
    main()
