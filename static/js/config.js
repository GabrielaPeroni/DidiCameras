function atualizarResumo() {
      const duracao = document.querySelectorAll("select")[0].value;
      const qualidade = document.querySelectorAll("select")[1].value;
      const formato = document.querySelectorAll("select")[2].value;
  
      document.querySelector(".summary-box").innerHTML = `
        <strong>Resumo</strong><br>
        Qualidade: <span class="highlight">${qualidade}</span><br>
        Duração: <span class="highlight">${duracao}</span><br>
        Formato: <span class="highlight">${formato}</span><br>
        Tamanho estimado: <span class="text-yellow">~10MB</span>
      `;
    }
  
    document.addEventListener("DOMContentLoaded", function () {
      const selects = document.querySelectorAll("select");
      const input = document.querySelector("input[type='text']");
  
      const valoresPadrao = {
        duracao: "30 segundos",
        qualidade: "Alta",
        formato: "MP4",
        compressao: "Média",
        salvarAuto: "Sim",
        nomeArquivo: "camera_{camera}_{date}_{time}"
      };
  
      selects.forEach(select => {
        select.addEventListener("change", atualizarResumo);
      });
  
      document.querySelector(".reset").addEventListener("click", function () {
        selects[0].value = valoresPadrao.duracao;
        selects[1].value = valoresPadrao.qualidade;
        selects[2].value = valoresPadrao.formato;
        selects[3].value = valoresPadrao.compressao;
        selects[4].value = valoresPadrao.salvarAuto;
        input.value = valoresPadrao.nomeArquivo;
        atualizarResumo();
      });
  
      // Botão salvar
      document.querySelector(".save").addEventListener("click", function () {
        const dados = {
          duracao: selects[0].value,
          qualidade: selects[1].value,
          formato: selects[2].value,
          compressao: selects[3].value,
          salvarAutomaticamente: selects[4].value,
          nomeArquivo: input.value
        };
  
        // Exibe uma mensagem simples
        alert("Configurações salvas com sucesso!");
  
        // Aqui você poderia mandar para o backend futuramente:
        // fetch("/salvar-config", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(dados)
        // });
      });
  
      atualizarResumo();
    });